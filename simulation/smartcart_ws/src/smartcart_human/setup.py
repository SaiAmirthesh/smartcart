from setuptools import find_packages, setup

package_name = 'smartcart_human'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='hari-aswath',
    maintainer_email='hariaswath07@gmail.com',
    description='Human controller for SmartCart simulation',
    license='Apache-2.0',
    extras_require={
        'test': [
            'pytest',
        ],
    },
    entry_points={
        'console_scripts': [
            'human_controller = smartcart_human.human_controller:main',
        ],
    },
)
