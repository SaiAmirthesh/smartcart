from setuptools import find_packages, setup

package_name = 'wolfbot_control'

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
    description='Human-following controller and SSH keyboard teleoperation for WolfBot hardware',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'follow_controller = wolfbot_control.follow_controller:main',
            'keyboard_teleop = wolfbot_control.keyboard_teleop:main',
        ],
    },
)
