from launch.substitutions import Command
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():

    # Gazebo world
    world = PathJoinSubstitution([
        FindPackageShare('smartcart_gazebo'),
        'worlds',
        'smartcart_world.sdf'
    ])

    # SmartCart Xacro
    robot_description_file = PathJoinSubstitution([
        FindPackageShare('smartcart_description'),
        'urdf',
        'smartcart.urdf.xacro'
    ])

    # Start Gazebo
    gazebo = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([
                FindPackageShare('ros_gz_sim'),
                'launch',
                'gz_sim.launch.py'
            ])
        ),
        launch_arguments={
            'gz_args': ['-r ', world]
        }.items()
    )

    # Publish robot_description and TF
    robot_state_publisher = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        output='screen',
       	parameters=[
    		{
        	'robot_description': Command([
            	'xacro ',
            	robot_description_file
        	])
    		}
	]
    )

    # Spawn robot in Gazebo
    spawn_robot = Node(
        package='ros_gz_sim',
        executable='create',
        arguments=[
            '-topic', 'robot_description',
            '-name', 'smartcart',
            '-z', '0.3'
        ],
        output='screen'
    )

    return LaunchDescription([
        gazebo,
        robot_state_publisher,
        spawn_robot
    ])
