# WolfBot Hardware ROS 2 Stack 🐺🤖

> **Target Platform:** Physical WolfBot / SmartCart Differential Drive Robot (Companion Computer via SSH)  
> **Simulation Dependencies:** **None** (100% Gazebo-free, pure hardware nodes)

This directory contains the readymade ROS 2 packages engineered specifically to be uploaded and run on the physical **WolfBot** companion computer (e.g. Raspberry Pi 4/5, NVIDIA Jetson, or x86 SBC running Ubuntu & ROS 2).

---

## 📦 Package Architecture

```
Wolfbot/
├── deploy.sh                          # Automated one-command SSH sync & remote build script
├── setup_hardware.sh                  # Hardware setup (udev rules, dialout/video permissions)
├── requirements.txt                   # Embedded Python dependencies (pyserial, opencv, numpy)
├── README.md                          # This hardware guide
└── src/
    ├── wolfbot_bringup/               # Master launch files & hardware parameter configs
    │   ├── config/hardware_params.yaml
    │   └── launch/
    │       ├── hardware.launch.py     # Starts description, motor driver, lidar, camera, safety stop
    │       ├── follow.launch.py       # Full autonomy: hardware + person tracking + follow controller
    │       └── teleop.launch.py       # Hardware bringup + interactive SSH terminal teleop
    ├── wolfbot_description/           # Pure hardware URDF (no <gazebo> tags)
    │   ├── urdf/wolfbot.urdf.xacro    # Coordinate frames: base_footprint, base_link, lidar_link, camera_link
    │   └── launch/description.launch.py
    ├── wolfbot_driver/                # Physical motor controller, odometry, and LiDAR watchdog
    │   ├── motor_driver_node.py       # Serial bridge to MCU (ESP32/Arduino), /cmd_vel -> motors, publishes /odom + TF
    │   ├── lidar_node.py              # Physical 2D LiDAR driver (/dev/ttyUSB1 -> /scan)
    │   └── lidar_safety_stop.py       # Collision prevention watchdog (halts forward speed if obstacle < 0.45m)
    ├── wolfbot_vision/                # Real camera capture and human tracking
    │   ├── camera_node.py             # Physical V4L2/USB camera capture (/dev/video0 -> /camera/image_raw)
    │   └── person_tracker.py          # Vision person detection + LiDAR depth fusion -> /target/pose
    └── wolfbot_control/               # Real-world motion control & SSH teleoperation
        ├── follow_controller.py       # Smooth proportional tracking with friction compensation & slew limiting
        └── keyboard_teleop.py         # Terminal-based teleop optimized for SSH sessions
```

---

## 🚀 Quick Start: Deploying to WolfBot via SSH

### 1. One-Command Upload (From Development Laptop)

Run the included deployment script from the `Wolfbot/` directory:

```bash
# Syntax: ./deploy.sh <user@robot_ip> [optional_remote_workspace_path]
./deploy.sh ubuntu@192.168.1.100 ~/wolfbot_ws
```

The script will:
1. Verify SSH connectivity.
2. Rsync the hardware packages directly to `~/wolfbot_ws/src/` on WolfBot (filtering out build artifacts, logs, and git caches).
3. Optionally trigger `colcon build --symlink-install` remotely over SSH.

### 2. Manual Upload Alternative

If you prefer using `rsync` or `scp` manually:

```bash
# Sync packages to WolfBot
rsync -avz --exclude "build/" --exclude "install/" --exclude "log/" \
  Wolfbot/src/ ubuntu@<WOLFBOT_IP>:~/wolfbot_ws/src/

# Sync setup scripts
scp Wolfbot/setup_hardware.sh Wolfbot/requirements.txt ubuntu@<WOLFBOT_IP>:~/wolfbot_ws/
```

---

## 🛠️ Onboard Setup (Run Once on WolfBot)

SSH into WolfBot:

```bash
ssh ubuntu@<WOLFBOT_IP>
cd ~/wolfbot_ws
```

### 1. Permissions and Udev Rules

Run the hardware setup script to grant serial and camera permissions and create persistent device symlinks (`/dev/wolfbot_motor`, `/dev/wolfbot_lidar`):

```bash
chmod +x setup_hardware.sh
./setup_hardware.sh
```

*(Log out and log back in once for user group permissions to take effect).*

### 2. Build the Workspace

```bash
source /opt/ros/${ROS_DISTRO:-jazzy}/setup.bash
cd ~/wolfbot_ws
colcon build --symlink-install
source install/setup.bash
```

---

## 🎮 Running on Physical Hardware

### Mode 1: Manual Driving & Motor Verification (Over SSH)

Test the motors and wheel directions directly from your SSH terminal:

```bash
ros2 launch wolfbot_bringup teleop.launch.py
```

* **Controls:** `w` (forward), `s` (reverse), `a` (steer left), `d` (steer right), `Space` / `x` (emergency halt), `q` (quit).

### Mode 2: Hardware Sensor Bringup

Start all physical drivers without autonomous controllers:

```bash
ros2 launch wolfbot_bringup hardware.launch.py
```

This starts:
* `wolfbot_motor_driver` connected to MCU on `/dev/ttyUSB0` (publishes `/odom`, broadcasts `odom -> base_footprint`).
* `wolfbot_lidar_node` streaming 360° ranges on `/scan`.
* `wolfbot_camera_node` streaming frames on `/camera/image_raw`.
* `wolfbot_lidar_safety_stop` watching for obstacles closer than `0.45m`.
* `robot_state_publisher` broadcasting the complete robot TF tree.

### Mode 3: Full Autonomous Customer Following

Start the full autonomous human-following pipeline:

```bash
ros2 launch wolfbot_bringup follow.launch.py
```

The robot will:
1. Detect the customer in front using the front camera.
2. Fuse the customer bearing angle with 2D LiDAR range returns to accurately determine target coordinates `(x, y)` in the `base_link` frame.
3. Automatically steer and follow at a safe standoff distance (default `1.2m`).
4. Trigger emergency braking if any obstacle or person enters the `< 0.45m` safety zone.

---

## ⚙️ Configuration & Hardware Pinouts

All parameters are configured in [`config/hardware_params.yaml`](src/wolfbot_bringup/config/hardware_params.yaml):

| Parameter | Default | Description |
| :--- | :--- | :--- |
| `port` (motor) | `/dev/ttyUSB0` | Microcontroller USB-Serial interface |
| `baud_rate` (motor) | `115200` | Baud rate for motor commands & telemetry |
| `wheel_separation` | `0.70 m` | Track width between left and right wheels |
| `wheel_radius` | `0.15 m` | Drive wheel radius |
| `port` (LiDAR) | `/dev/ttyUSB1` | 2D LiDAR serial port |
| `device_id` (Camera) | `0` (`/dev/video0`) | Physical camera V4L2 device index |
| `emergency_stop_distance` | `0.45 m` | Minimum stopping distance from obstacles |
| `target_distance` | `1.20 m` | Target standoff distance from customer |

### Serial Protocol (Companion Computer $\leftrightarrow$ Motor MCU)

* **Commands sent to MCU:**
  ```text
  SPEED <left_wheel_m_s> <right_wheel_m_s>\n
  Example: SPEED 0.250 0.250
  ```
* **Telemetry received from MCU (optional):**
  ```text
  ODOM <x> <y> <yaw> <v_lin> <v_ang>\n
  ```
  *(If MCU does not report odometry, the driver integrates dead-reckoning automatically).*
* **Watchdog:** If `/cmd_vel` is not received for $> 0.5\text{ s}$, the driver immediately sends `SPEED 0.000 0.000\n` to prevent runaway behavior.
