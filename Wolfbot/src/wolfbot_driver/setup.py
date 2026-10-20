from setuptools import find_packages, setup

package_name = 'wolfbot_driver'

setup(
    name=package_name,
    version='1.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='SmartCart Hardware Team',
    maintainer_email='sai@smartcart.local',
    description='Hardware motor driver, encoder odometry, and LiDAR safety stop for WolfBot',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'motor_driver = wolfbot_driver.motor_driver_node:main',
            'lidar_driver = wolfbot_driver.lidar_node:main',
            'lidar_safety_stop = wolfbot_driver.lidar_safety_stop:main',
        ],
    },
)
