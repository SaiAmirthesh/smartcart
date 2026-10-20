#!/usr/bin/env python3
"""Launch robot_state_publisher for WolfBot hardware."""

import os
from launch import LaunchDescription
from launch.substitutions import Command, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    pkg_share = FindPackageShare('wolfbot_description')
    xacro_file = PathJoinSubstitution([pkg_share, 'urdf', 'wolfbot.urdf.xacro'])

    robot_description = Command(['xacro ', xacro_file])

    rsp_node = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        name='robot_state_publisher',
        output='screen',
        parameters=[{
            'robot_description': robot_description,
            'use_sim_time': False
        }]
    )

    jsp_node = Node(
        package='joint_state_publisher',
        executable='joint_state_publisher',
        name='joint_state_publisher',
        output='screen',
        parameters=[{'use_sim_time': False}]
    )

    return LaunchDescription([
        rsp_node,
        jsp_node
    ])
