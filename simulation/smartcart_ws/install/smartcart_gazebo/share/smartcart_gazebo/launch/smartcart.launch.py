from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import PathJoinSubstitution, Command
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():

    # =========================
    # GAZEBO WORLD
    # =========================

    world = PathJoinSubstitution([
        FindPackageShare('smartcart_gazebo'),
        'worlds',
        'smartcart_world.sdf'
    ])


    # =========================
    # SMARTCART XACRO
    # =========================

    robot_description_file = PathJoinSubstitution([
        FindPackageShare('smartcart_description'),
        'urdf',
        'smartcart.urdf.xacro'
    ])


    # =========================
    # START GAZEBO
    # =========================

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


    # =========================
    # ROBOT STATE PUBLISHER
    # =========================

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


    # =========================
    # SPAWN SMARTCART
    # =========================

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


    # =========================
    # LIDAR BRIDGE
    # =========================

    lidar_bridge = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        arguments=[
            '/scan@sensor_msgs/msg/LaserScan@gz.msgs.LaserScan'
        ],
        output='screen'
    )


    # =========================
    # CAMERA BRIDGE
    # =========================

    camera_bridge = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        arguments=[
            '/camera/image_raw@sensor_msgs/msg/Image@gz.msgs.Image',
            '/camera/camera_info@sensor_msgs/msg/CameraInfo@gz.msgs.CameraInfo'
        ],
        output='screen'
    )


    # =========================
    # LAUNCH EVERYTHING
    # =========================

    return LaunchDescription([
        gazebo,
        robot_state_publisher,
        spawn_robot,
        lidar_bridge,
        camera_bridge
    ])
