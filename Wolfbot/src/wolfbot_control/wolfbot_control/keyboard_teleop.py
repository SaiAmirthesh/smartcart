#!/usr/bin/env python3
"""
WolfBot SSH Keyboard Teleoperation Node.

Runs directly inside an SSH terminal session without requiring GUI.
Reads single keypresses via termios/tty and publishes geometry_msgs/msg/Twist
commands to /cmd_vel with live velocity reporting.
"""

import os
import select
import sys
import termios
import tty
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

BANNER = """
=====================================================
            WolfBot SSH Keyboard Teleop
=====================================================
  Control Keys:
        w
   a    s    d

   w : Increase forward speed (+0.05 m/s)
   s : Increase reverse speed (-0.05 m/s)
   a : Turn left (+0.10 rad/s)
   d : Turn right (-0.10 rad/s)
   Space / x : EMERGENCY STOP (0.0 m/s, 0.0 rad/s)
   q : Quit and restore terminal

   Publishing to: /cmd_vel
=====================================================
"""


class WolfbotKeyboardTeleop(Node):

    def __init__(self):
        super().__init__('wolfbot_keyboard_teleop')

        self.declare_parameter('cmd_vel_topic', '/cmd_vel')
        self.declare_parameter('linear_step', 0.05)
        self.declare_parameter('angular_step', 0.10)
        self.declare_parameter('max_linear_speed', 0.60)
        self.declare_parameter('max_angular_speed', 1.20)

        self.cmd_topic = self.get_parameter('cmd_vel_topic').get_parameter_value().string_value
        self.linear_step = self.get_parameter('linear_step').get_parameter_value().double_value
        self.angular_step = self.get_parameter('angular_step').get_parameter_value().double_value
        self.max_v = self.get_parameter('max_linear_speed').get_parameter_value().double_value
        self.max_w = self.get_parameter('max_angular_speed').get_parameter_value().double_value

        self.cmd_pub = self.create_publisher(Twist, self.cmd_topic, 10)

        self.target_v = 0.0
        self.target_w = 0.0

        # Save terminal settings
        self.settings = None
        if sys.stdin.isatty():
            self.settings = termios.tcgetattr(sys.stdin)

        print(BANNER)
        self.print_status()

        # 20 Hz publish loop
        self.pub_timer = self.create_timer(0.05, self.publish_velocity)
        # 50 Hz key reading loop
        self.key_timer = self.create_timer(0.02, self.read_key_loop)

    def print_status(self):
        sys.stdout.write(f"\r>> Linear: {self.target_v:+.2f} m/s | Angular: {self.target_w:+.2f} rad/s    ")
        sys.stdout.flush()

    def get_key(self):
        if not sys.stdin.isatty():
            return None
        tty.setraw(sys.stdin.fileno())
        rlist, _, _ = select.select([sys.stdin], [], [], 0.0)
        key = None
        if rlist:
            key = sys.stdin.read(1)
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self.settings)
        return key

    def read_key_loop(self):
        key = self.get_key()
        if not key:
            return

        if key == 'w':
            self.target_v = min(self.target_v + self.linear_step, self.max_v)
        elif key == 's':
            self.target_v = max(self.target_v - self.linear_step, -self.max_v)
        elif key == 'a':
            self.target_w = min(self.target_w + self.angular_step, self.max_w)
        elif key == 'd':
            self.target_w = max(self.target_w - self.angular_step, -self.max_w)
        elif key in (' ', 'x'):
            self.target_v = 0.0
            self.target_w = 0.0
        elif key in ('q', '\x03'):  # q or Ctrl+C
            print("\nExiting Teleoperation...")
            self.target_v = 0.0
            self.target_w = 0.0
            self.publish_velocity()
            rclpy.shutdown()
            return

        self.print_status()

    def publish_velocity(self):
        twist = Twist()
        twist.linear.x = float(self.target_v)
        twist.angular.z = float(self.target_w)
        self.cmd_pub.publish(twist)

    def restore_terminal(self):
        if self.settings and sys.stdin.isatty():
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self.settings)


def main(args=None):
    rclpy.init(args=args)
    node = WolfbotKeyboardTeleop()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.restore_terminal()
        if rclpy.ok():
            node.destroy_node()
            rclpy.shutdown()


if __name__ == '__main__':
    main()
