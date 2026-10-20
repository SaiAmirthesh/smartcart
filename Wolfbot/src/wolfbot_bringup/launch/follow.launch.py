#!/usr/bin/env python3
"""
WolfBot Autonomous Human-Following Launch File.

Brings up complete physical hardware stack and starts:
- Camera + LiDAR fusion customer person tracker (/target/pose)
- Autonomous human-following controller (/cmd_vel_raw -> /cmd_vel)
"""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    bringup_pkg = FindPackageShare('wolfbot_bringup')
    config_file = PathJoinSubstitution([bringup_pkg, 'config', 'hardware_params.yaml'])

    sim_hw_arg = DeclareLaunchArgument(
        'simulate_hardware',
        default_value='false',
        description='Run drivers in loopback mode if physical sensors are disconnected'
    )

    simulate_hw = LaunchConfiguration('simulate_hardware')

    # 1. Base Hardware Stack
    hardware_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([bringup_pkg, 'launch', 'hardware.launch.py'])
        ),
        launch_arguments={'simulate_hardware': simulate_hw}.items()
    )

    # 2. Person Perception Tracker
    tracker_node = Node(
        package='wolfbot_vision',
        executable='person_tracker',
        name='wolfbot_person_tracker',
        output='screen',
        parameters=[config_file]
    )

    # 3. Follow Controller
    controller_node = Node(
        package='wolfbot_control',
        executable='follow_controller',
        name='wolfbot_follow_controller',
        output='screen',
        parameters=[config_file]
    )

    return LaunchDescription([
        sim_hw_arg,
        hardware_launch,
        tracker_node,
        controller_node
    ])
