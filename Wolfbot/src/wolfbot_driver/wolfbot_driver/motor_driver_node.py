#!/usr/bin/env python3
"""
WolfBot Hardware Motor Driver & Odometry Node.

Bridges ROS 2 /cmd_vel with the onboard physical microcontroller (ESP32/Arduino)
via serial. Publishes wheel odometry and broadcasts TF (odom -> base_footprint).
Includes a 0.5s safety watchdog and auto-reconnection logic.
"""

import math
import time
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist, TransformStamped
from nav_msgs.msg import Odometry
from tf2_ros import TransformBroadcaster

try:
    import serial
except ImportError:
    serial = None


class WolfbotMotorDriver(Node):

    def __init__(self):
        super().__init__('wolfbot_motor_driver')

        # Parameters
        self.declare_parameter('port', '/dev/ttyUSB0')
        self.declare_parameter('baud_rate', 115200)
        self.declare_parameter('wheel_separation', 0.70)
        self.declare_parameter('wheel_radius', 0.15)
        self.declare_parameter('max_linear_speed', 0.60)
        self.declare_parameter('max_angular_speed', 1.20)
        self.declare_parameter('cmd_vel_timeout', 0.50)
        self.declare_parameter('publish_tf', True)
        self.declare_parameter('odom_frame', 'odom')
        self.declare_parameter('base_frame', 'base_footprint')
        self.declare_parameter('simulate_hardware', False)

        self.port = self.get_parameter('port').get_parameter_value().string_value
        self.baud_rate = self.get_parameter('baud_rate').get_parameter_value().integer_value
        self.wheel_separation = self.get_parameter('wheel_separation').get_parameter_value().double_value
        self.wheel_radius = self.get_parameter('wheel_radius').get_parameter_value().double_value
        self.max_linear_speed = self.get_parameter('max_linear_speed').get_parameter_value().double_value
        self.max_angular_speed = self.get_parameter('max_angular_speed').get_parameter_value().double_value
        self.cmd_vel_timeout = self.get_parameter('cmd_vel_timeout').get_parameter_value().double_value
        self.publish_tf = self.get_parameter('publish_tf').get_parameter_value().bool_value
        self.odom_frame = self.get_parameter('odom_frame').get_parameter_value().string_value
        self.base_frame = self.get_parameter('base_frame').get_parameter_value().string_value
        self.simulate_hardware = self.get_parameter('simulate_hardware').get_parameter_value().bool_value

        # Publishers
        self.odom_pub = self.create_publisher(Odometry, '/wheel/odometry', 10)
        self.raw_odom_pub = self.create_publisher(Odometry, '/odom', 10)
        self.tf_broadcaster = TransformBroadcaster(self)

        # Subscriber
        self.cmd_sub = self.create_subscription(Twist, '/cmd_vel', self.cmd_vel_cb, 10)

        # State variables
        self.target_v = 0.0
        self.target_w = 0.0
        self.last_cmd_time = time.time()
        self.last_odom_time = time.time()

        # Odometry integration state
        self.x = 0.0
        self.y = 0.0
        self.yaw = 0.0
        self.current_v = 0.0
        self.current_w = 0.0

        # Serial connection
        self.serial_conn = None
        if not self.simulate_hardware:
            self.init_serial()
        else:
            self.get_logger().info('Running in SIMULATED HARDWARE mode (no serial port required)')

        # Timers: 20 Hz control and odometry loop, 0.5 Hz serial reconnect check
        self.control_timer = self.create_timer(0.05, self.control_and_odom_loop)
        self.reconnect_timer = self.create_timer(2.0, self.check_reconnect)

        self.get_logger().info(
            f'WolfBot Motor Driver initialized on port [{self.port}] @ {self.baud_rate} baud. '
            f'Wheel separation: {self.wheel_separation}m, radius: {self.wheel_radius}m'
        )

    def init_serial(self):
        if serial is None:
            self.get_logger().warn('pyserial is not installed! Falling back to simulated hardware mode.')
            self.simulate_hardware = True
            return

        try:
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baud_rate,
                timeout=0.05,
                write_timeout=0.05
            )
            # Flush buffers
            self.serial_conn.reset_input_buffer()
            self.serial_conn.reset_output_buffer()
            self.get_logger().info(f'Connected to WolfBot physical motor controller on {self.port}')
        except Exception as e:
            self.get_logger().warn(
                f'Could not open serial port {self.port}: {e}. Will retry periodically. (Motors held at zero)'
            )
            self.serial_conn = None

    def check_reconnect(self):
        if not self.simulate_hardware and (self.serial_conn is None or not self.serial_conn.is_open):
            self.init_serial()

    def cmd_vel_cb(self, msg: Twist):
        # Clamp velocity for physical hardware limits
        v = max(min(msg.linear.x, self.max_linear_speed), -self.max_linear_speed)
        w = max(min(msg.angular.z, self.max_angular_speed), -self.max_angular_speed)

        self.target_v = v
        self.target_w = w
        self.last_cmd_time = time.time()

    def control_and_odom_loop(self):
        now = time.time()
        dt = now - self.last_odom_time
        if dt <= 0:
            dt = 0.05
        self.last_odom_time = now

        # Safety Watchdog: stop motors if no /cmd_vel in cmd_vel_timeout
        if now - self.last_cmd_time > self.cmd_vel_timeout:
            self.target_v = 0.0
            self.target_w = 0.0

        # Differential drive inverse kinematics
        # v_left = v - (w * L / 2)
        # v_right = v + (w * L / 2)
        half_w = self.wheel_separation / 2.0
        v_left = self.target_v - (self.target_w * half_w)
        v_right = self.target_v + (self.target_w * half_w)

        # Transmit to hardware microcontroller
        if self.serial_conn and self.serial_conn.is_open:
            try:
                # Standard protocol: "SPEED <v_left> <v_right>\n"
                cmd_str = f"SPEED {v_left:.3f} {v_right:.3f}\n"
                self.serial_conn.write(cmd_str.encode('ascii'))

                # Read incoming telemetry if available
                while self.serial_conn.in_waiting > 0:
                    line = self.serial_conn.readline().decode('ascii', errors='ignore').strip()
                    if line.startswith("ODOM"):
                        parts = line.split()
                        if len(parts) >= 6:
                            self.x = float(parts[1])
                            self.y = float(parts[2])
                            self.yaw = float(parts[3])
                            self.current_v = float(parts[4])
                            self.current_w = float(parts[5])
            except Exception as e:
                self.get_logger().error(f'Serial communication error: {e}')
                try:
                    self.serial_conn.close()
                except Exception:
                    pass
                self.serial_conn = None

        # Dead-reckoning integration (fallback or hardware simulation)
        self.current_v = 0.8 * self.current_v + 0.2 * self.target_v
        self.current_w = 0.8 * self.current_w + 0.2 * self.target_w

        self.yaw += self.current_w * dt
        # Normalize yaw [-pi, pi]
        self.yaw = math.atan2(math.sin(self.yaw), math.cos(self.yaw))
        self.x += self.current_v * math.cos(self.yaw) * dt
        self.y += self.current_v * math.sin(self.yaw) * dt

        # Publish Odometry message
        current_ros_time = self.get_clock().now().to_msg()
        odom = Odometry()
        odom.header.stamp = current_ros_time
        odom.header.frame_id = self.odom_frame
        odom.child_frame_id = self.base_frame

        odom.pose.pose.position.x = self.x
        odom.pose.pose.position.y = self.y
        odom.pose.pose.position.z = 0.0

        # Yaw to quaternion
        qz = math.sin(self.yaw / 2.0)
        qw = math.cos(self.yaw / 2.0)
        odom.pose.pose.orientation.x = 0.0
        odom.pose.pose.orientation.y = 0.0
        odom.pose.pose.orientation.z = qz
        odom.pose.pose.orientation.w = qw

        odom.twist.twist.linear.x = self.current_v
        odom.twist.twist.angular.z = self.current_w

        self.odom_pub.publish(odom)
        self.raw_odom_pub.publish(odom)

        # Broadcast TF transform
        if self.publish_tf:
            t = TransformStamped()
            t.header.stamp = current_ros_time
            t.header.frame_id = self.odom_frame
            t.child_frame_id = self.base_frame

            t.transform.translation.x = self.x
            t.transform.translation.y = self.y
            t.transform.translation.z = 0.0
            t.transform.rotation.x = 0.0
            t.transform.rotation.y = 0.0
            t.transform.rotation.z = qz
            t.transform.rotation.w = qw

            self.tf_broadcaster.sendTransform(t)

    def destroy_node(self):
        # Stop motors on shutdown
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.write(b"SPEED 0.000 0.000\n")
                self.serial_conn.close()
            except Exception:
                pass
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = WolfbotMotorDriver()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
