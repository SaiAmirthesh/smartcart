#!/usr/bin/env python3
"""
WolfBot Hardware Human-Following Controller Node.

Converts customer target pose (/target/pose) into smooth, proportional
differential drive velocity commands (/cmd_vel_raw or /cmd_vel).
Includes slew-rate acceleration limiting, static friction compensation,
and direct LiDAR emergency stop integration.
"""

import math
import time
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist, Pose
from sensor_msgs.msg import LaserScan
from nav_msgs.msg import Odometry


class WolfbotFollowController(Node):

    def __init__(self):
        super().__init__('wolfbot_follow_controller')

        # Parameters
        self.declare_parameter('target_pose_topic', '/target/pose')
        self.declare_parameter('cmd_vel_topic', '/cmd_vel_raw')
        self.declare_parameter('scan_topic', '/scan')
        self.declare_parameter('target_distance', 1.20)         # meters
        self.declare_parameter('deadband_distance', 0.08)       # meters
        self.declare_parameter('deadband_angle', 0.08)          # radians (~4.5 deg)
        self.declare_parameter('k_distance', 0.65)              # Proportional gain for linear speed
        self.declare_parameter('k_angle', 1.10)                 # Proportional gain for angular speed
        self.declare_parameter('max_linear_speed', 0.45)        # m/s
        self.declare_parameter('min_linear_speed', 0.15)        # m/s to overcome motor friction
        self.declare_parameter('max_angular_speed', 0.90)       # rad/s
        self.declare_parameter('min_angular_speed', 0.25)       # rad/s to overcome skid friction
        self.declare_parameter('max_linear_accel', 0.40)        # m/s^2 slew rate limit
        self.declare_parameter('max_angular_accel', 1.20)       # rad/s^2 slew rate limit
        self.declare_parameter('target_timeout', 1.50)          # seconds
        self.declare_parameter('obstacle_stop_distance', 0.45)  # meters

        self.target_pose_topic = self.get_parameter('target_pose_topic').get_parameter_value().string_value
        self.cmd_vel_topic = self.get_parameter('cmd_vel_topic').get_parameter_value().string_value
        self.scan_topic = self.get_parameter('scan_topic').get_parameter_value().string_value
        self.target_dist = self.get_parameter('target_distance').get_parameter_value().double_value
        self.deadband_dist = self.get_parameter('deadband_distance').get_parameter_value().double_value
        self.deadband_ang = self.get_parameter('deadband_angle').get_parameter_value().double_value
        self.k_dist = self.get_parameter('k_distance').get_parameter_value().double_value
        self.k_ang = self.get_parameter('k_angle').get_parameter_value().double_value
        self.max_v = self.get_parameter('max_linear_speed').get_parameter_value().double_value
        self.min_v = self.get_parameter('min_linear_speed').get_parameter_value().double_value
        self.max_w = self.get_parameter('max_angular_speed').get_parameter_value().double_value
        self.min_w = self.get_parameter('min_angular_speed').get_parameter_value().double_value
        self.max_a_lin = self.get_parameter('max_linear_accel').get_parameter_value().double_value
        self.max_a_ang = self.get_parameter('max_angular_accel').get_parameter_value().double_value
        self.target_timeout = self.get_parameter('target_timeout').get_parameter_value().double_value
        self.obstacle_stop_dist = self.get_parameter('obstacle_stop_distance').get_parameter_value().double_value

        # Publishers & Subscribers
        self.cmd_pub = self.create_publisher(Twist, self.cmd_vel_topic, 10)
        self.create_subscription(Pose, self.target_pose_topic, self.target_pose_cb, 10)
        self.create_subscription(LaserScan, self.scan_topic, self.scan_cb, 10)

        # State
        self.last_target_pose = None
        self.last_target_time = 0.0
        self.last_control_time = time.time()
        self.last_scan = None
        self.current_v = 0.0
        self.current_w = 0.0

        # 10 Hz Control Loop
        self.timer = self.create_timer(0.1, self.control_loop)

        self.get_logger().info(
            f'WolfBot Follow Controller ready: [{self.target_pose_topic}] -> [{self.cmd_vel_topic}] '
            f'(Target distance: {self.target_dist}m)'
        )

    def target_pose_cb(self, msg: Pose):
        self.last_target_pose = msg
        self.last_target_time = time.time()

    def scan_cb(self, msg: LaserScan):
        self.last_scan = msg

    def check_front_obstacle(self) -> bool:
        if not self.last_scan or not self.last_scan.ranges:
            return False

        cone_rad = math.radians(30.0)
        for i, r in enumerate(self.last_scan.ranges):
            if math.isnan(r) or math.isinf(r) or r < 0.15:
                continue
            angle = self.last_scan.angle_min + (i * self.last_scan.angle_increment)
            angle = math.atan2(math.sin(angle), math.cos(angle))
            if abs(angle) <= cone_rad and r < self.obstacle_stop_dist:
                return True
        return False

    def control_loop(self):
        now = time.time()
        dt = now - self.last_control_time
        if dt <= 0:
            dt = 0.1
        self.last_control_time = now

        target_cmd_v = 0.0
        target_cmd_w = 0.0

        age = now - self.last_target_time
        has_valid_target = (self.last_target_pose is not None and age <= self.target_timeout)

        if has_valid_target:
            tx = self.last_target_pose.position.x
            ty = self.last_target_pose.position.y

            distance = math.hypot(tx, ty)
            azimuth = math.atan2(ty, tx)

            dist_err = distance - self.target_dist

            # Proportional linear speed
            if abs(dist_err) > self.deadband_dist:
                raw_v = self.k_dist * dist_err
                if raw_v > 0:
                    target_cmd_v = max(self.min_v, min(self.max_v, raw_v))
                else:
                    # Gentle reverse if customer steps back
                    target_cmd_v = max(-self.min_v, min(0.0, raw_v))
            else:
                target_cmd_v = 0.0

            # Proportional angular speed
            if abs(azimuth) > self.deadband_ang:
                raw_w = self.k_ang * azimuth
                if raw_w > 0:
                    target_cmd_w = max(self.min_w, min(self.max_w, raw_w))
                else:
                    target_cmd_w = min(-self.min_w, max(-self.max_w, raw_w))
            else:
                target_cmd_w = 0.0

            # LiDAR safety check override
            if self.check_front_obstacle() and target_cmd_v > 0.0:
                target_cmd_v = 0.0
                self.get_logger().warn('Obstacle in front! Clamping forward motion.', throttle_duration_sec=1.0)
        else:
            # No target: smoothly bring robot to rest
            target_cmd_v = 0.0
            target_cmd_w = 0.0

        # Slew-rate acceleration limiting (prevent motor stalls & jerks)
        delta_v = target_cmd_v - self.current_v
        max_delta_v = self.max_a_lin * dt
        self.current_v += max(min(delta_v, max_delta_v), -max_delta_v)

        delta_w = target_cmd_w - self.current_w
        max_delta_w = self.max_a_ang * dt
        self.current_w += max(min(delta_w, max_delta_w), -max_delta_w)

        # Zero small residuals
        if abs(self.current_v) < 0.02 and target_cmd_v == 0.0:
            self.current_v = 0.0
        if abs(self.current_w) < 0.02 and target_cmd_w == 0.0:
            self.current_w = 0.0

        # Publish Twist
        twist = Twist()
        twist.linear.x = float(self.current_v)
        twist.angular.z = float(self.current_w)
        self.cmd_pub.publish(twist)


def main(args=None):
    rclpy.init(args=args)
    node = WolfbotFollowController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
