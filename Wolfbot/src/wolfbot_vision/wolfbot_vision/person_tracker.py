#!/usr/bin/env python3
"""
WolfBot Hardware Person Perception & Camera-LiDAR Fusion Node.

Detects human customer using OpenCV vision, fuses with 2D LiDAR range
to determine 3D position relative to robot base_link, and publishes `/target/pose`.
"""

import json
import math
import time
import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Pose
from sensor_msgs.msg import Image, LaserScan
from std_msgs.msg import String
from cv_bridge import CvBridge


class WolfbotPersonTracker(Node):

    def __init__(self):
        super().__init__('wolfbot_person_tracker')

        # Parameters
        self.declare_parameter('camera_topic', '/camera/image_raw')
        self.declare_parameter('scan_topic', '/scan')
        self.declare_parameter('target_pose_topic', '/target/pose')
        self.declare_parameter('target_status_topic', '/target/status')
        self.declare_parameter('debug_image_topic', '/camera/detections_image')
        self.declare_parameter('hfov_deg', 60.0)
        self.declare_parameter('max_follow_distance', 4.5)
        self.declare_parameter('min_follow_distance', 0.5)
        self.declare_parameter('lost_timeout', 1.8)

        self.camera_topic = self.get_parameter('camera_topic').get_parameter_value().string_value
        self.scan_topic = self.get_parameter('scan_topic').get_parameter_value().string_value
        self.target_pose_topic = self.get_parameter('target_pose_topic').get_parameter_value().string_value
        self.target_status_topic = self.get_parameter('target_status_topic').get_parameter_value().string_value
        self.debug_img_topic = self.get_parameter('debug_image_topic').get_parameter_value().string_value
        self.hfov_rad = math.radians(self.get_parameter('hfov_deg').get_parameter_value().double_value)
        self.max_dist = self.get_parameter('max_follow_distance').get_parameter_value().double_value
        self.min_dist = self.get_parameter('min_follow_distance').get_parameter_value().double_value
        self.lost_timeout = self.get_parameter('lost_timeout').get_parameter_value().double_value

        self.bridge = CvBridge()

        # Publishers
        self.target_pose_pub = self.create_publisher(Pose, self.target_pose_topic, 10)
        self.status_pub = self.create_publisher(String, self.target_status_topic, 10)
        self.debug_img_pub = self.create_publisher(Image, self.debug_img_topic, 10)

        # Subscribers
        self.create_subscription(Image, self.camera_topic, self.image_cb, 10)
        self.create_subscription(LaserScan, self.scan_topic, self.scan_cb, 10)

        # Vision detector: OpenCV HOG People Detector
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

        # State
        self.last_scan = None
        self.target_x = 0.0
        self.target_y = 0.0
        self.target_dist = 0.0
        self.target_azimuth = 0.0
        self.last_detection_time = 0.0
        self.is_tracking = False
        self.vx = 0.0
        self.vy = 0.0

        # 10 Hz processing timer for state & telemetry
        self.timer = self.create_timer(0.1, self.telemetry_loop)

        self.get_logger().info(
            f'WolfBot Person Tracker initialized: [{self.camera_topic}] + [{self.scan_topic}] -> [{self.target_pose_topic}]'
        )

    def scan_cb(self, msg: LaserScan):
        self.last_scan = msg

    def get_lidar_distance_at_angle(self, target_angle_rad: float) -> float:
        """Find closest valid LiDAR return within ±5 degrees of visual azimuth."""
        if not self.last_scan or not self.last_scan.ranges:
            return 1.5  # Default estimate if LiDAR not ready

        msg = self.last_scan
        window_rad = math.radians(6.0)

        min_range = float('inf')
        num_ranges = len(msg.ranges)

        for i, r in enumerate(msg.ranges):
            if math.isnan(r) or math.isinf(r) or r < 0.2:
                continue

            angle = msg.angle_min + (i * msg.angle_increment)
            angle = math.atan2(math.sin(angle), math.cos(angle))

            if abs(angle - target_angle_rad) <= window_rad:
                if r < min_range:
                    min_range = r

        if min_range != float('inf') and self.min_dist <= min_range <= self.max_dist:
            return min_range
        return float('nan')

    def image_cb(self, msg: Image):
        try:
            cv_img = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
        except Exception as e:
            self.get_logger().error(f'cv_bridge error: {e}')
            return

        h, w = cv_img.shape[:2]
        cx = w / 2.0
        fx = (w / 2.0) / math.tan(self.hfov_rad / 2.0)

        # Resize for fast embedded inference on WolfBot (Jetson / Raspberry Pi)
        scale = 0.5
        small = cv2.resize(cv_img, (0, 0), fx=scale, fy=scale)

        # Detect people
        rects, weights = self.hog.detectMultiScale(
            small, winStride=(8, 8), padding=(8, 8), scale=1.05
        )

        detected_target = None
        best_area = 0

        for i, (rx, ry, rw, rh) in enumerate(rects):
            # Scale coordinates back
            bx = int(rx / scale)
            by = int(ry / scale)
            bw = int(rw / scale)
            bh = int(rh / scale)

            area = bw * bh
            if area > best_area:
                best_area = area
                detected_target = (bx, by, bw, bh)

            # Draw bystander / detection rects
            cv2.rectangle(cv_img, (bx, by), (bx + bw, by + bh), (255, 128, 0), 2)

        now = time.time()

        if detected_target is not None:
            bx, by, bw, bh = detected_target
            center_x = bx + bw / 2.0
            center_y = by + bh / 2.0

            # Compute horizontal bearing angle
            azimuth_rad = math.atan2(center_x - cx, fx)

            # Fuse with LiDAR range
            dist = self.get_lidar_distance_at_angle(azimuth_rad)

            # Fallback distance from visual bounding box height if LiDAR return occluded
            if math.isnan(dist):
                # Standard human height ~ 1.7m: dist = (fx * real_height) / pixel_height
                dist = (fx * 1.6) / max(bh, 1)
                dist = min(max(dist, 0.8), self.max_dist)

            # Calculate relative cartesian coordinates in base_link (x: forward, y: left)
            new_x = dist * math.cos(azimuth_rad) + 0.32  # 0.32m camera front offset
            new_y = -dist * math.sin(azimuth_rad)

            # Velocity filtering
            dt = now - self.last_detection_time
            if 0 < dt < 1.0 and self.is_tracking:
                self.vx = 0.7 * self.vx + 0.3 * ((new_x - self.target_x) / dt)
                self.vy = 0.7 * self.vy + 0.3 * ((new_y - self.target_y) / dt)

            self.target_x = new_x
            self.target_y = new_y
            self.target_dist = dist
            self.target_azimuth = azimuth_rad
            self.last_detection_time = now
            self.is_tracking = True

            # Draw active tracked customer HUD
            cv2.rectangle(cv_img, (bx, by), (bx + bw, by + bh), (0, 255, 0), 3)
            cv2.circle(cv_img, (int(center_x), int(center_y)), 5, (0, 0, 255), -1)
            cv2.putText(
                cv_img, f'CUSTOMER: {dist:.2f}m | Az: {math.degrees(azimuth_rad):.1f}deg',
                (bx, max(20, by - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2
            )

            # Publish Target Pose
            target_pose = Pose()
            target_pose.position.x = float(self.target_x)
            target_pose.position.y = float(self.target_y)
            target_pose.position.z = 0.0
            # Facing toward robot
            target_pose.orientation.w = 1.0
            self.target_pose_pub.publish(target_pose)

        # Draw HUD status overlay
        status_txt = "LOCKED" if self.is_tracking else "SEARCHING"
        hud_color = (0, 255, 0) if self.is_tracking else (0, 0, 255)
        cv2.putText(cv_img, f"WolfBot Tracker: {status_txt}", (15, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, hud_color, 2)

        # Publish debug image
        try:
            debug_msg = self.bridge.cv2_to_imgmsg(cv_img, encoding='bgr8')
            debug_msg.header = msg.header
            self.debug_img_pub.publish(debug_msg)
        except Exception:
            pass

    def telemetry_loop(self):
        now = time.time()
        age = now - self.last_detection_time

        if self.is_tracking and age > self.lost_timeout:
            self.is_tracking = False
            self.get_logger().info('Customer target lost. Reverting to SEARCHING state.')

        status_data = {
            "state": "TRACKING" if self.is_tracking else "SEARCHING",
            "target_distance": round(self.target_dist, 2) if self.is_tracking else None,
            "target_azimuth_deg": round(math.degrees(self.target_azimuth), 1) if self.is_tracking else None,
            "target_x": round(self.target_x, 2) if self.is_tracking else None,
            "target_y": round(self.target_y, 2) if self.is_tracking else None,
            "age_seconds": round(age, 2)
        }
        msg = String()
        msg.data = json.dumps(status_data)
        self.status_pub.publish(msg)


def main(args=None):
    rclpy.init(args=args)
    node = WolfbotPersonTracker()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
