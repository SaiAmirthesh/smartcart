#!/usr/bin/env bash
# ==============================================================================
# WolfBot Hardware Environment Setup Script
# Run this script ON the physical WolfBot robot to configure device permissions,
# udev rules for serial devices, and python dependencies.
# Usage:
#   chmod +x setup_hardware.sh && ./setup_hardware.sh
# ==============================================================================

set -e

echo "=================================================================="
echo "          Configuring WolfBot Physical Hardware Environment       "
echo "=================================================================="

# 1. Add current user to required hardware groups
echo "1. Adding user $USER to hardware access groups (dialout, video, i2c)..."
sudo usermod -a -G dialout,video,i2c $USER || true

# 2. Install python dependencies
echo "2. Installing required Python hardware packages..."
pip install -r requirements.txt || pip3 install -r requirements.txt --break-system-packages || true

# 3. Create udev rules for predictable serial ports
echo "3. Installing udev rules for predictable device aliases..."
UDEV_RULE_FILE="/etc/udev/rules.d/99-wolfbot.rules"

sudo bash -c "cat << 'EOF' > $UDEV_RULE_FILE
# CP210x / FTDI / CH340 USB-Serial (WolfBot Motor Controller)
KERNEL==\"ttyUSB*\", ATTRS{idVendor}==\"10c4\", ATTRS{idProduct}==\"ea60\", MODE=\"0666\", SYMLINK+=\"wolfbot_motor\"
KERNEL==\"ttyACM*\", ATTRS{idVendor}==\"2e8a\", MODE=\"0666\", SYMLINK+=\"wolfbot_motor\"

# RPLiDAR / Serial LiDAR
KERNEL==\"ttyUSB*\", ATTRS{idVendor}==\"10c4\", ATTRS{idProduct}==\"ea60\", MODE=\"0666\", SYMLINK+=\"wolfbot_lidar\"
KERNEL==\"ttyUSB*\", ATTRS{idVendor}==\"0403\", ATTRS{idProduct}==\"6001\", MODE=\"0666\", SYMLINK+=\"wolfbot_lidar\"
EOF"

echo "Reloading udev rules..."
sudo udevadm control --reload-rules && sudo udevadm trigger || true

echo "=================================================================="
echo "Hardware setup complete! Please log out and back in for group"
echo "permissions to take effect: logout"
echo "=================================================================="
