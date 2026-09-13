import rclpy
from rclpy.node import Node

from geometry_msgs.msg import Pose
from ros_gz_interfaces.srv import SetEntityPose


class HumanController(Node):

    def __init__(self):
        super().__init__('human_controller')

        # Gazebo set_pose service
        self.client = self.create_client(
            SetEntityPose,
            '/world/smartcart_world/set_pose'
        )

        self.get_logger().info('Waiting for Gazebo set_pose service...')

        while not self.client.wait_for_service(timeout_sec=1.0):
            self.get_logger().info(
                'Waiting for /world/smartcart_world/set_pose...'
            )

        self.get_logger().info('Gazebo set_pose service connected!')

        # Human starting position
        self.x = 2.0
        self.y = 0.0
        self.z = 0.0

        # Movement direction
        self.direction = 1.0

        # Human speed
        self.speed = 0.02

        # Update every 0.1 seconds
        self.timer = self.create_timer(
            0.1,
            self.move_human
        )

    def move_human(self):

        # Update position
        self.x += self.speed * self.direction

        # Reverse direction at boundaries
        if self.x >= 6.0:
            self.x = 6.0
            self.direction = -1.0

        elif self.x <= 2.0:
            self.x = 2.0
            self.direction = 1.0

        # Create service request
        request = SetEntityPose.Request()

        # Specify the entity
        request.entity.name = 'human'
        request.entity.type = 2  # MODEL

        # Set human position
        request.pose.position.x = self.x
        request.pose.position.y = self.y
        request.pose.position.z = self.z

        # Keep human upright
        request.pose.orientation.x = 0.0
        request.pose.orientation.y = 0.0
        request.pose.orientation.z = 0.0
        request.pose.orientation.w = 1.0

        # Send request to Gazebo
        self.client.call_async(request)


def main(args=None):

    rclpy.init(args=args)

    node = HumanController()

    rclpy.spin(node)

    node.destroy_node()

    rclpy.shutdown()


if __name__ == '__main__':
    main()
