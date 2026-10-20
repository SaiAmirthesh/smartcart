#!/usr/bin/env python3
"""
WolfBot Hardware Camera Capture Node.

Streams video frames from physical camera (/dev/video0 or USB/CSI)
and publishes standard sensor_msgs/msg/Image and CameraInfo messages.
"""

import time
import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CameraInfo
from cv_bridge import CvBridge


class WolfbotCameraNode(Node):

    def __init__(self):
        super().__init__('wolfbot_camera_node')

        # Parameters
        self.declare_parameter('device_id', 0)
        self.declare_parameter('width', 640)
        self.declare_parameter('height', 480)
        self.declare_parameter('fps', 30.0)
        self.declare_parameter('frame_id', 'camera_optical_link')
        self.declare_parameter('image_topic', '/camera/image_raw')
        self.declare_parameter('camera_info_topic', '/camera/camera_info')
        self.declare_parameter('simulate_camera', False)

        self.device_id = self.get_parameter('device_id').get_parameter_value().integer_value
        self.width = self.get_parameter('width').get_parameter_value().integer_value
        self.height = self.get_parameter('height').get_parameter_value().integer_value
        self.fps = self.get_parameter('fps').get_parameter_value().double_value
        self.frame_id = self.get_parameter('frame_id').get_parameter_value().string_value
        self.image_topic = self.get_parameter('image_topic').get_parameter_value().string_value
        self.camera_info_topic = self.get_parameter('camera_info_topic').get_parameter_value().string_value
        self.simulate_camera = self.get_parameter('simulate_camera').get_parameter_value().bool_value

        self.image_pub = self.create_publisher(Image, self.image_topic, 10)
        self.info_pub = self.create_publisher(CameraInfo, self.camera_info_topic, 10)
        self.bridge = CvBridge()

        self.cap = None
        if not self.simulate_camera:
            self.init_camera()
        else:
            self.get_logger().info('Running Camera in SIMULATED mode (generating test frame)')

        # Timer for camera frame acquisition
        timer_period = 1.0 / max(1.0, self.fps)
        self.timer = self.create_timer(timer_period, self.capture_and_publish)
        self.reconnect_timer = self.create_timer(3.0, self.check_reconnect)

        self.get_logger().info(
            f'WolfBot Camera initialized on device [{self.device_id}] ({self.width}x{self.height} @ {self.fps} FPS), '
            f'publishing to [{self.image_topic}]'
        )

    def init_camera(self):
        try:
            self.cap = cv2.VideoCapture(self.device_id)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                self.cap.set(cv2.CAP_PROP_FPS, self.fps)
                self.get_logger().info(f'Physical camera opened on /dev/video{self.device_id}')
            else:
                self.get_logger().warn(
                    f'Could not open /dev/video{self.device_id}. Will retry. (Falling back to test pattern)'
                )
                self.cap = None
        except Exception as e:
            self.get_logger().warn(f'Error opening camera device: {e}')
            self.cap = None

    def check_reconnect(self):
        if not self.simulate_camera and (self.cap is None or not self.cap.isOpened()):
            self.init_camera()

    def get_camera_info(self, stamp):
        info = CameraInfo()
        info.header.stamp = stamp
        info.header.frame_id = self.frame_id
        info.width = self.width
        info.height = self.height
        info.distortion_model = 'plumb_bob'
        info.d = [0.0, 0.0, 0.0, 0.0, 0.0]

        # Synthetic pinhole intrinsics: 60 deg HFOV
        fx = (self.width / 2.0) / np.tan(np.radians(30.0))
        fy = fx
        cx = self.width / 2.0
        cy = self.height / 2.0

        info.k = [fx, 0.0, cx,
                  0.0, fy, cy,
                  0.0, 0.0, 1.0]
        info.p = [fx, 0.0, cx, 0.0,
                  0.0, fy, cy, 0.0,
                  0.0, 0.0, 1.0, 0.0]
        return info

    def capture_and_publish(self):
        stamp = self.get_clock().now().to_msg()
        frame = None

        if self.cap and self.cap.isOpened():
            ret, captured_frame = self.cap.read()
            if ret and captured_frame is not None:
                frame = captured_frame
            else:
                self.get_logger().warn('Failed to read frame from physical camera. Resetting...')
                self.cap.release()
                self.cap = None

        # Fallback test pattern if camera is disconnected
        if frame is None:
            frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
            cv2.putText(
                frame, 'WolfBot Hardware Camera (Standby)', (30, self.height // 2),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2
            )
            cv2.putText(
                frame, time.strftime("%H:%M:%S"), (30, self.height // 2 + 40),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1
            )

        try:
            img_msg = self.bridge.cv2_to_imgmsg(frame, encoding='bgr8')
            img_msg.header.stamp = stamp
            img_msg.header.frame_id = self.frame_id

            info_msg = self.get_camera_info(stamp)

            self.image_pub.publish(img_msg)
            self.info_pub.publish(info_msg)
        except Exception as e:
            self.get_logger().error(f'Failed to publish camera image: {e}')

    def destroy_node(self):
        if self.cap and self.cap.isOpened():
            self.cap.release()
        super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = WolfbotCameraNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
