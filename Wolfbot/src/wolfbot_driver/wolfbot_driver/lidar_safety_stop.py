#!/usr/bin/env python3
"""
WolfBot Hardware LiDAR Safety Stop & Collision Avoidance Watchdog.

Monitors `/scan` returns in the forward safety cone (±30°).
If an obstacle is closer than the emergency threshold (default 0.45m),
it overrides forward motion and enforces an emergency brake while
permitting safe rotational alignment away from obstacles.
"""

import json
import math
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from sensor_msgs.msg import LaserScan
from std_msgs.msg import String


class WolfbotLidarSafetyStop(Node):

    def __init__(self):
        super().__init__('wolfbot_lidar_safety_stop')

        # Parameters
        self.declare_parameter('input_cmd_topic', '/cmd_vel_raw')
        self.declare_parameter('output_cmd_topic', '/cmd_vel')
        self.declare_parameter('scan_topic', '/scan')
        self.declare_parameter('emergency_stop_distance', 0.45)  # meters
        self.declare_parameter('slowdown_distance', 0.80)        # meters
        self.declare_parameter('front_cone_angle_deg', 35.0)     # ±35 degrees
        self.declare_parameter('min_valid_distance', 0.12)       # filter robot chassis reflection

        self.input_cmd_topic = self.get_parameter('input_cmd_topic').get_parameter_value().string_value
        self.output_cmd_topic = self.get_parameter('output_cmd_topic').get_parameter_value().string_value
        self.scan_topic = self.get_parameter('scan_topic').get_parameter_value().string_value
        self.emergency_stop_dist = self.get_parameter('emergency_stop_distance').get_parameter_value().double_value
        self.slowdown_dist = self.get_parameter('slowdown_distance').get_parameter_value().double_value
        self.front_cone_rad = math.radians(self.get_parameter('front_cone_angle_deg').get_parameter_value().double_value)
        self.min_valid_dist = self.get_parameter('min_valid_distance').get_parameter_value().double_value

        # Publishers & Subscribers
        self.safe_cmd_pub = self.create_publisher(Twist, self.output_cmd_topic, 10)
        self.status_pub = self.create_publisher(String, '/wolfbot/safety_status', 10)

        self.create_subscription(Twist, self.input_cmd_topic, self.cmd_vel_cb, 10)
        self.create_subscription(LaserScan, self.scan_topic, self.scan_cb, 10)

        # State
        self.is_obstacle_detected = False
        self.min_front_distance = float('inf')
        self.obstacle_angle_rad = 0.0
        self.latest_raw_cmd = Twist()
        self.last_cmd_received_time = self.get_clock().now()

        # 20 Hz Watchdog publication
        self.timer = self.create_timer(0.05, self.safety_loop)

        self.get_logger().info(
            f'LiDAR Safety Stop active: [{self.input_cmd_topic}] -> [{self.output_cmd_topic}], '
            f'Stop dist: {self.emergency_stop_dist}m, Slowdown dist: {self.slowdown_dist}m'
        )

    def scan_cb(self, msg: LaserScan):
        if not msg.ranges:
            return

        min_dist = float('inf')
        min_angle = 0.0

        num_ranges = len(msg.ranges)
        for i, dist in enumerate(msg.ranges):
            if math.isnan(dist) or math.isinf(dist):
                continue
            if dist < self.min_valid_dist or dist > msg.range_max:
                continue

            angle = msg.angle_min + (i * msg.angle_increment)
            # Normalize to [-pi, pi]
            angle = math.atan2(math.sin(angle), math.cos(angle))

            # Check if within forward safety cone
            if abs(angle) <= self.front_cone_rad:
                if dist < min_dist:
                    min_dist = dist
                    min_angle = angle

        self.min_front_distance = min_dist
        self.obstacle_angle_rad = min_angle
        self.is_obstacle_detected = (min_dist <= self.emergency_stop_dist)

    def cmd_vel_cb(self, msg: Twist):
        self.latest_raw_cmd = msg
        self.last_cmd_received_time = self.get_clock().now()

    def safety_loop(self):
        safe_cmd = Twist()
        safe_cmd.linear.x = self.latest_raw_cmd.linear.x
        safe_cmd.linear.y = self.latest_raw_cmd.linear.y
        safe_cmd.angular.z = self.latest_raw_cmd.angular.z

        status_text = "CLEAR"

        # If obstacle detected in emergency zone and trying to drive forward
        if self.is_obstacle_detected:
            if safe_cmd.linear.x > 0.0:
                safe_cmd.linear.x = 0.0  # Zero forward velocity
                status_text = f"EMERGENCY_STOP: Obstacle at {self.min_front_distance:.2f}m"
        elif self.min_front_distance < self.slowdown_dist:
            # Scale down linear speed proportionally
            scale = max(0.1, (self.min_front_distance - self.emergency_stop_dist) / (self.slowdown_dist - self.emergency_stop_dist))
            if safe_cmd.linear.x > 0.0:
                safe_cmd.linear.x *= scale
                status_text = f"SLOWDOWN: Obstacle at {self.min_front_distance:.2f}m (Scale: {scale:.2f})"

        self.safe_cmd_pub.publish(safe_cmd)

        # Publish safety status JSON
        status_payload = {
            "status": status_text,
            "obstacle_detected": self.is_obstacle_detected,
            "min_front_dist": float(self.min_front_distance) if not math.isinf(self.min_front_distance) else 99.0,
            "obstacle_angle_deg": math.degrees(self.obstacle_angle_rad),
            "linear_x": safe_cmd.linear.x,
            "angular_z": safe_cmd.angular.z
        }
        status_msg = String()
        status_msg.data = json.dumps(status_payload)
        self.status_pub.publish(status_msg)


def main(args=None):
    rclpy.init(args=args)
    node = WolfbotLidarSafetyStop()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
