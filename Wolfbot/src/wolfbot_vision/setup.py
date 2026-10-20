from setuptools import find_packages, setup

package_name = 'wolfbot_vision'

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
    description='Hardware camera capture and vision-based customer tracking with LiDAR fusion for WolfBot',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'camera_node = wolfbot_vision.camera_node:main',
            'person_tracker = wolfbot_vision.person_tracker:main',
        ],
    },
)
