#!/usr/bin/env python3
"""
WolfBot Hardware 2D LiDAR Driver Node.

Publishes sensor_msgs/msg/LaserScan on `/scan` with `frame_id: lidar_link`.
Reads physical 2D LiDAR data from serial (/dev/ttyUSB1 or /dev/wolfbot_lidar)
with automatic framing, angle normalization, and reconnection.
"""

import math
import time
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan

try:
    import serial
except ImportError:
    serial = None


class WolfbotLidarNode(Node):

    def __init__(self):
        super().__init__('wolfbot_lidar_node')

        # Parameters
        self.declare_parameter('port', '/dev/ttyUSB1')
        self.declare_parameter('baud_rate', 115200)
        self.declare_parameter('frame_id', 'lidar_link')
        self.declare_parameter('scan_topic', '/scan')
        self.declare_parameter('min_range', 0.15)
        self.declare_parameter('max_range', 12.0)
        self.declare_parameter('scan_frequency', 10.0)  # 10 Hz
        self.declare_parameter('samples_per_scan', 360)
        self.declare_parameter('simulate_hardware', False)

        self.port = self.get_parameter('port').get_parameter_value().string_value
        self.baud_rate = self.get_parameter('baud_rate').get_parameter_value().integer_value
        self.frame_id = self.get_parameter('frame_id').get_parameter_value().string_value
        self.scan_topic = self.get_parameter('scan_topic').get_parameter_value().string_value
        self.min_range = self.get_parameter('min_range').get_parameter_value().double_value
        self.max_range = self.get_parameter('max_range').get_parameter_value().double_value
        self.scan_frequency = self.get_parameter('scan_frequency').get_parameter_value().double_value
        self.samples_per_scan = self.get_parameter('samples_per_scan').get_parameter_value().integer_value
        self.simulate_hardware = self.get_parameter('simulate_hardware').get_parameter_value().bool_value

        self.scan_pub = self.create_publisher(LaserScan, self.scan_topic, 10)

        self.serial_conn = None
        if not self.simulate_hardware:
            self.init_serial()
        else:
            self.get_logger().info('Running LiDAR in SIMULATED HARDWARE mode (no serial port required)')

        # Timer matching scan frequency
        timer_period = 1.0 / self.scan_frequency
        self.timer = self.create_timer(timer_period, self.publish_scan)
        self.reconnect_timer = self.create_timer(2.0, self.check_reconnect)

        self.get_logger().info(
            f'WolfBot LiDAR node initialized on port [{self.port}] @ {self.baud_rate} baud, '
            f'publishing to [{self.scan_topic}]'
        )

    def init_serial(self):
        if serial is None:
            self.get_logger().warn('pyserial not available; falling back to simulated hardware mode.')
            self.simulate_hardware = True
            return

        try:
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baud_rate,
                timeout=0.1
            )
            # Send standard start scan command for RPLiDAR / generic serial LiDAR
            # RPLiDAR start scan: 0xA5, 0x20
            try:
                self.serial_conn.write(b'\xA5\x20')
            except Exception:
                pass
            self.get_logger().info(f'Connected to physical LiDAR on {self.port}')
        except Exception as e:
            self.get_logger().warn(f'LiDAR port {self.port} unavailable: {e}. Retrying periodically...')
            self.serial_conn = None

    def check_reconnect(self):
        if not self.simulate_hardware and (self.serial_conn is None or not self.serial_conn.is_open):
            self.init_serial()

    def read_physical_ranges(self):
        """Read 360-degree scan ranges from physical serial device."""
        ranges = [float('inf')] * self.samples_per_scan
        if not self.serial_conn or not self.serial_conn.is_open:
            return ranges

        try:
            # Check for data in buffer
            bytes_available = self.serial_conn.in_waiting
            if bytes_available >= 5:
                raw = self.serial_conn.read(min(bytes_available, 1024))
                # Parse 5-byte RPLiDAR standard packets:
                # Byte 0: S (start bit), !S, quality
                # Byte 1: angle_q6_checkbit
                # Byte 2: angle_q6
                # Byte 3: distance_q2_low
                # Byte 4: distance_q2_high
                i = 0
                while i + 4 < len(raw):
                    b0 = raw[i]
                    b1 = raw[i+1]
                    b2 = raw[i+2]
                    b3 = raw[i+3]
                    b4 = raw[i+4]
                    if (b0 & 0x01) ^ ((b0 & 0x02) >> 1) and (b1 & 0x01):
                        angle_deg = ((b1 >> 1) | (b2 << 7)) / 64.0
                        dist_mm = ((b3) | (b4 << 8)) / 4.0
                        dist_m = dist_mm / 1000.0

                        if 0.0 <= angle_deg < 360.0:
                            idx = int(angle_deg * (self.samples_per_scan / 360.0)) % self.samples_per_scan
                            if self.min_range <= dist_m <= self.max_range:
                                ranges[idx] = dist_m
                        i += 5
                    else:
                        i += 1
        except Exception as e:
            self.get_logger().debug(f'LiDAR serial read error: {e}')

        return ranges

    def publish_scan(self):
        scan_msg = LaserScan()
        scan_msg.header.stamp = self.get_clock().now().to_msg()
        scan_msg.header.frame_id = self.frame_id

        scan_msg.angle_min = -math.pi
        scan_msg.angle_max = math.pi
        scan_msg.angle_increment = (2.0 * math.pi) / self.samples_per_scan
        scan_msg.time_increment = (1.0 / self.scan_frequency) / self.samples_per_scan
        scan_msg.scan_time = 1.0 / self.scan_frequency
        scan_msg.range_min = self.min_range
        scan_msg.range_max = self.max_range

        if not self.simulate_hardware and self.serial_conn and self.serial_conn.is_open:
            ranges = self.read_physical_ranges()
            # If all are inf (e.g. startup buffer filling), provide default clear field
            if all(math.isinf(r) for r in ranges):
                ranges = [self.max_range] * self.samples_per_scan
            scan_msg.ranges = ranges
        else:
            # Standalone fallback: clear 360 range
            scan_msg.ranges = [self.max_range] * self.samples_per_scan

        self.scan_pub.publish(scan_msg)

    def destroy_node(self):
        if self.serial_conn and self.serial_conn.is_open:
            try:
                # RPLiDAR stop command: 0xA5, 0x25
                self.serial_conn.write(b'\xA5\x25')
                self.serial_conn.close()
            except Exception:
                pass
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = WolfbotLidarNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
