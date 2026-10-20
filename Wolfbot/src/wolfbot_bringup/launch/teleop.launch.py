#!/usr/bin/env python3
"""
WolfBot Manual SSH Teleoperation Launch File.

Launches physical hardware drivers and starts interactive keyboard teleop
directly inside the SSH terminal.
"""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    bringup_pkg = FindPackageShare('wolfbot_bringup')

    sim_hw_arg = DeclareLaunchArgument(
        'simulate_hardware',
        default_value='false',
        description='Run drivers in loopback mode if physical hardware not connected'
    )

    simulate_hw = LaunchConfiguration('simulate_hardware')

    # 1. Hardware Stack
    hardware_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([bringup_pkg, 'launch', 'hardware.launch.py'])
        ),
        launch_arguments={'simulate_hardware': simulate_hw}.items()
    )

    # 2. Interactive Keyboard Teleoperation
    teleop_node = Node(
        package='wolfbot_control',
        executable='keyboard_teleop',
        name='wolfbot_keyboard_teleop',
        output='screen',
        prefix='xterm -e' if False else ''
    )

    return LaunchDescription([
        sim_hw_arg,
        hardware_launch,
        teleop_node
    ])
