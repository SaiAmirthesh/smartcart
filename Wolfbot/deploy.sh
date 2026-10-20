#!/usr/bin/env bash
# ==============================================================================
# WolfBot SSH Deployment Script
# Automatically syncs the WolfBot hardware packages to the physical robot via SSH
# Usage:
#   ./deploy.sh [user@wolfbot_ip] [optional_remote_dir]
# Example:
#   ./deploy.sh ubuntu@192.168.1.100 ~/wolfbot_ws
# ==============================================================================

set -e

# Default settings
TARGET_HOST="${1:-}"
REMOTE_WS="${2:-~/wolfbot_ws}"

if [ -z "$TARGET_HOST" ]; then
    echo "=================================================================="
    echo "                   WolfBot SSH Deploy Tool                        "
    echo "=================================================================="
    echo "Usage: ./deploy.sh <user@robot_ip> [remote_workspace_path]"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh ubuntu@192.168.1.100"
    echo "  ./deploy.sh pi@wolfbot.local ~/robot_ws"
    echo "=================================================================="
    read -p "Enter WolfBot SSH target (e.g. ubuntu@192.168.1.50): " TARGET_HOST
    if [ -z "$TARGET_HOST" ]; then
        echo "Error: No SSH target specified. Aborting."
        exit 1
    fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "------------------------------------------------------------------"
echo "1. Checking SSH connectivity to $TARGET_HOST..."
ssh -q -o BatchMode=yes -o ConnectTimeout=5 "$TARGET_HOST" exit 2>/dev/null || {
    echo "Notice: Could not connect passwordlessly. You may be prompted for SSH password."
}

echo "------------------------------------------------------------------"
echo "2. Preparing remote workspace directory on WolfBot: $REMOTE_WS/src..."
ssh "$TARGET_HOST" "mkdir -p $REMOTE_WS/src"

echo "------------------------------------------------------------------"
echo "3. Syncing Wolfbot packages to $TARGET_HOST:$REMOTE_WS/src/..."
rsync -avz --progress \
    --exclude "build/" \
    --exclude "install/" \
    --exclude "log/" \
    --exclude ".git/" \
    --exclude "__pycache__/" \
    --exclude "*.pyc" \
    --exclude ".pytest_cache/" \
    "$SCRIPT_DIR/src/" "$TARGET_HOST:$REMOTE_WS/src/"

# Also sync setup scripts and configs to remote workspace root
rsync -avz --progress \
    "$SCRIPT_DIR/setup_hardware.sh" \
    "$SCRIPT_DIR/requirements.txt" \
    "$TARGET_HOST:$REMOTE_WS/"

echo "------------------------------------------------------------------"
echo ">> Sync Complete!"
echo "------------------------------------------------------------------"
read -p "Do you want to build the workspace on WolfBot now via SSH? [y/N]: " BUILD_NOW
if [[ "$BUILD_NOW" =~ ^[Yy]$ ]]; then
    echo "Building workspace on WolfBot..."
    ssh -t "$TARGET_HOST" "bash -c 'source /opt/ros/\${ROS_DISTRO:-jazzy}/setup.bash && cd $REMOTE_WS && colcon build --symlink-install'"
    echo "Build finished! Sourced workspace: source $REMOTE_WS/install/setup.bash"
fi

echo ""
echo "=================================================================="
echo "WolfBot is ready to run! Connect via SSH:"
echo "  ssh $TARGET_HOST"
echo "  cd $REMOTE_WS"
echo "  source install/setup.bash"
echo "  ros2 launch wolfbot_bringup follow.launch.py"
echo "=================================================================="
