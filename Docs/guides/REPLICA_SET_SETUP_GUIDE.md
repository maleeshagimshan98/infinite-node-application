# MongoDB Replica Set Setup Guide

This guide will help you set up a MongoDB replica set with two members running as native OS
services — no Docker required. Pick the section for your platform: [Windows](#windows) or
[Linux](#linux). Both walk through the same shape: create data directories, write two config files,
install/start two `mongod` instances as services, then run `rs.initiate()` once.

## Windows

This section sets up a MongoDB replica set with two members running as Windows services.

### Prerequisites

- MongoDB installed on your Windows machine
- Administrator access to your Windows machine
- PowerShell

### Important: Update Paths

Throughout this section, replace `<MONGODB_INSTALL_PATH>` with your actual MongoDB installation directory.

**Common examples:**

- `C:\Program Files\MongoDB\Server\7.0`
- `D:\MongoDB`
- `C:\MongoDB`

To find your MongoDB installation path, run:

```powershell
Get-Command mongod | Select-Object Source
```

Or check where mongod.exe is located:

```powershell
Get-ChildItem -Path C:\ -Filter mongod.exe -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

### Complete Setup Steps

#### Step 1: Create Directory Structure

Open PowerShell (no admin required) and navigate to your MongoDB installation directory:

```powershell
# Replace <MONGODB_INSTALL_PATH> with your actual path
cd <MONGODB_INSTALL_PATH>

# Create the replica folder structure
New-Item -ItemType Directory -Path "replica" -Force
New-Item -ItemType Directory -Path "replica\rs1" -Force
New-Item -ItemType Directory -Path "replica\rs2" -Force
```

**Example with actual path:**

```powershell
cd D:\MongoDB
New-Item -ItemType Directory -Path "replica" -Force
New-Item -ItemType Directory -Path "replica\rs1" -Force
New-Item -ItemType Directory -Path "replica\rs2" -Force
```

#### Step 2: Create Configuration Files

You need to create two configuration files for the replica set members.

##### Create rs1.conf (First Member - Port 27017)

Create a file at `<MONGODB_INSTALL_PATH>\replica\rs1.conf` with the following content:

**File content:**

```yaml
systemLog:
  destination: file
  path: <MONGODB_INSTALL_PATH>\replica\rs1\mongod.log
  logAppend: true

storage:
  dbPath: <MONGODB_INSTALL_PATH>\replica\rs1

net:
  bindIp: localhost
  port: 27017

replication:
  replSetName: rs0
```

**PowerShell command to create the file:**

```powershell
@"
systemLog:
  destination: file
  path: <MONGODB_INSTALL_PATH>\replica\rs1\mongod.log
  logAppend: true

storage:
  dbPath: <MONGODB_INSTALL_PATH>\replica\rs1

net:
  bindIp: localhost
  port: 27017

replication:
  replSetName: rs0
"@ | Out-File -FilePath "<MONGODB_INSTALL_PATH>\replica\rs1.conf" -Encoding UTF8
```

**Example with D:\MongoDB:**

```powershell
@"
systemLog:
  destination: file
  path: D:\MongoDB\replica\rs1\mongod.log
  logAppend: true

storage:
  dbPath: D:\MongoDB\replica\rs1

net:
  bindIp: localhost
  port: 27017

replication:
  replSetName: rs0
"@ | Out-File -FilePath "D:\MongoDB\replica\rs1.conf" -Encoding UTF8
```

##### Create rs2.conf (Second Member - Port 27018)

Create a file at `<MONGODB_INSTALL_PATH>\replica\rs2.conf` with the following content:

**File content:**

```yaml
systemLog:
  destination: file
  path: <MONGODB_INSTALL_PATH>\replica\rs2\mongod.log
  logAppend: true

storage:
  dbPath: <MONGODB_INSTALL_PATH>\replica\rs2

net:
  bindIp: localhost
  port: 27018

replication:
  replSetName: rs0
```

**PowerShell command to create the file:**

```powershell
@"
systemLog:
  destination: file
  path: <MONGODB_INSTALL_PATH>\replica\rs2\mongod.log
  logAppend: true

storage:
  dbPath: <MONGODB_INSTALL_PATH>\replica\rs2

net:
  bindIp: localhost
  port: 27018

replication:
  replSetName: rs0
"@ | Out-File -FilePath "<MONGODB_INSTALL_PATH>\replica\rs2.conf" -Encoding UTF8
```

**Example with D:\MongoDB:**

```powershell
@"
systemLog:
  destination: file
  path: D:\MongoDB\replica\rs2\mongod.log
  logAppend: true

storage:
  dbPath: D:\MongoDB\replica\rs2

net:
  bindIp: localhost
  port: 27018

replication:
  replSetName: rs0
"@ | Out-File -FilePath "D:\MongoDB\replica\rs2.conf" -Encoding UTF8
```

**⚠️ IMPORTANT:** Make sure all paths in the configuration files match your actual MongoDB installation path.

#### Step 3: Stop Existing MongoDB Service (if any)

**IMPORTANT:** If you have an old MongoDB service running, it will conflict with the replica set.

Open **PowerShell as Administrator** and run:

```powershell
# Check for existing MongoDB services
Get-Service | Where-Object {$_.Name -like "*mongo*"}

# If you see a service named "MongoDB", stop and disable it
Stop-Service MongoDB
Set-Service MongoDB -StartupType Disabled
```

#### Step 4: Install MongoDB as Windows Services

**⚠️ Administrator PowerShell Required**

In **PowerShell as Administrator**, run these commands (replace `<MONGODB_INSTALL_PATH>` with your actual path):

```powershell
# Install first replica set member
<MONGODB_INSTALL_PATH>\bin\mongod.exe --config "<MONGODB_INSTALL_PATH>\replica\rs1.conf" --install --serviceName "MongoDB-rs1" --serviceDisplayName "MongoDB Replica Set Member 1"

# Install second replica set member
<MONGODB_INSTALL_PATH>\bin\mongod.exe --config "<MONGODB_INSTALL_PATH>\replica\rs2.conf" --install --serviceName "MongoDB-rs2" --serviceDisplayName "MongoDB Replica Set Member 2"
```

**Example with D:\MongoDB:**

```powershell
D:\MongoDB\bin\mongod.exe --config "D:\MongoDB\replica\rs1.conf" --install --serviceName "MongoDB-rs1" --serviceDisplayName "MongoDB Replica Set Member 1"

D:\MongoDB\bin\mongod.exe --config "D:\MongoDB\replica\rs2.conf" --install --serviceName "MongoDB-rs2" --serviceDisplayName "MongoDB Replica Set Member 2"
```

**Example with C:\Program Files\MongoDB\Server\7.0:**

```powershell
& "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --config "C:\Program Files\MongoDB\Server\7.0\replica\rs1.conf" --install --serviceName "MongoDB-rs1" --serviceDisplayName "MongoDB Replica Set Member 1"

& "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --config "C:\Program Files\MongoDB\Server\7.0\replica\rs2.conf" --install --serviceName "MongoDB-rs2" --serviceDisplayName "MongoDB Replica Set Member 2"
```

> **Note:** If your path contains spaces, use the `&` operator before the quoted path.

#### Step 5: Start the Services

```powershell
Start-Service MongoDB-rs1
Start-Service MongoDB-rs2

# Verify they're running
Get-Service MongoDB-rs1, MongoDB-rs2
```

Both services should show **Status: Running**

#### Step 6: Set Services to Auto-Start on Boot

```powershell
Set-Service MongoDB-rs1 -StartupType Automatic
Set-Service MongoDB-rs2 -StartupType Automatic
```

#### Step 7: Initialize the Replica Set (ONE-TIME SETUP)

This step connects the two MongoDB instances so they work together as a replica set.

**This only needs to be done once!** The configuration persists after initialization.

##### Option A: Using MongoDB Compass (Recommended)

1. Open **MongoDB Compass**
2. Connect to: `mongodb://localhost:27017`
3. Click on the **"\_MONGOSH"** tab at the bottom of the window
4. Copy and paste this command:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "localhost:27017" },
    { _id: 1, host: "localhost:27018" },
  ],
});
```

5. Press Enter
6. You should see: `{ ok: 1 }`

##### Option B: Using mongosh Command Line

If `mongosh.exe` exists in your MongoDB bin directory:

```powershell
<MONGODB_INSTALL_PATH>\bin\mongosh.exe --port 27017
```

**Example:**

```powershell
D:\MongoDB\bin\mongosh.exe --port 27017
```

Then paste the same `rs.initiate()` command from Option A.

#### Step 8: Verify Replica Set Status

In the same MongoDB shell (Compass or mongosh), run:

```javascript
rs.status();
```

You should see both members listed. One will be `PRIMARY` and one will be `SECONDARY`.

### Service Management Commands (Windows)

All commands should be run in **PowerShell as Administrator**.

#### Check Service Status

```powershell
Get-Service MongoDB-rs1, MongoDB-rs2
```

#### Start Services

```powershell
Start-Service MongoDB-rs1
Start-Service MongoDB-rs2
```

#### Stop Services

```powershell
Stop-Service MongoDB-rs1
Stop-Service MongoDB-rs2
```

#### Restart Services

```powershell
Restart-Service MongoDB-rs1
Restart-Service MongoDB-rs2
```

#### Check Which Ports Are in Use

```powershell
netstat -ano | findstr "27017 27018" | findstr "LISTENING"
```

### Troubleshooting (Windows)

#### Error: "This node was not started with replication enabled"

This means you're connected to a MongoDB instance that wasn't started with the replica configuration files.

**Solution:** Make sure the old "MongoDB" service is stopped and only MongoDB-rs1 and MongoDB-rs2 are running.

```powershell
Get-Service | Where-Object {$_.Name -like "*mongo*"}
Stop-Service MongoDB
```

#### Port Already in Use

**Symptom:** Service fails to start

**Solution:**

1. Check what's using the port: `netstat -ano | findstr "27017"`
2. Stop any conflicting MongoDB services
3. Restart the replica set services

#### Service Won't Start

1. Check the log files:
   - `<MONGODB_INSTALL_PATH>\replica\rs1\mongod.log`
   - `<MONGODB_INSTALL_PATH>\replica\rs2\mongod.log`

2. Ensure data directories exist and have proper permissions

3. Verify configuration files have correct paths (no `<MONGODB_INSTALL_PATH>` placeholders remaining!)

4. Make sure paths in config files use backslashes `\` (Windows format)

#### Cannot Initialize Replica Set

**Error:** "already initialized"

**Solution:** The replica set is already configured. Check status with `rs.status()`

#### mongod.exe Not Found

**Error:** "The term 'mongod' is not recognized..."

**Solution:** Use the full path to mongod.exe:

```powershell
# Find MongoDB installation
Get-ChildItem -Path C:\ -Filter mongod.exe -Recurse -ErrorAction SilentlyContinue

# Then use the full path in all commands
```

### Uninstalling Services (If Needed)

If you need to remove the services and start over:

```powershell
# Stop services
Stop-Service MongoDB-rs1
Stop-Service MongoDB-rs2

# Uninstall services (replace with your path)
<MONGODB_INSTALL_PATH>\bin\mongod.exe --remove --serviceName "MongoDB-rs1"
<MONGODB_INSTALL_PATH>\bin\mongod.exe --remove --serviceName "MongoDB-rs2"
```

**Example:**

```powershell
D:\MongoDB\bin\mongod.exe --remove --serviceName "MongoDB-rs1"
D:\MongoDB\bin\mongod.exe --remove --serviceName "MongoDB-rs2"
```

### Windows-Specific Notes

- **Path formats:** Windows uses backslashes `\` in paths. Make sure all paths in config files follow this format.
- **Spaces in paths:** If your MongoDB path contains spaces, use quotes around paths and the `&` operator when running commands.

## Linux

This section sets up the same two-member replica set on Linux, running each member as its own
systemd service.

### Prerequisites

- MongoDB installed on your Linux machine (e.g. via the `mongodb-org` package from MongoDB's apt/yum repo)
- `sudo` access
- A distro using `systemd` (Ubuntu, Debian, RHEL/CentOS/Rocky, Fedora, etc.)

### Important: Update Paths

Throughout this section, replace `<MONGODB_DATA_PATH>` with wherever you want the replica set's
data and logs to live. A common choice is alongside MongoDB's default data directory:

**Common examples:**

- `/var/lib/mongodb` (Debian/Ubuntu default `dbPath` parent)
- `/var/lib/mongo` (RHEL/Fedora default `dbPath` parent)
- `/data` (a custom location)

To find your `mongod` binary and confirm the install:

```bash
which mongod
mongod --version
```

### Complete Setup Steps

#### Step 1: Create Directory Structure

```bash
# Replace <MONGODB_DATA_PATH> with your chosen path
sudo mkdir -p <MONGODB_DATA_PATH>/replica/rs1
sudo mkdir -p <MONGODB_DATA_PATH>/replica/rs2
sudo mkdir -p /var/log/mongodb

# The mongod service normally runs as the "mongodb" user — make sure it owns these directories
sudo chown -R mongodb:mongodb <MONGODB_DATA_PATH>/replica /var/log/mongodb
```

**Example with /var/lib/mongodb:**

```bash
sudo mkdir -p /var/lib/mongodb/replica/rs1
sudo mkdir -p /var/lib/mongodb/replica/rs2
sudo mkdir -p /var/log/mongodb
sudo chown -R mongodb:mongodb /var/lib/mongodb/replica /var/log/mongodb
```

#### Step 2: Create Configuration Files

You need to create two configuration files for the replica set members. Same fields as Windows —
just Linux paths.

##### Create rs1.conf (First Member - Port 27017)

Create `/etc/mongod-rs1.conf`:

```yaml
systemLog:
  destination: file
  path: /var/log/mongodb/rs1.log
  logAppend: true

storage:
  dbPath: <MONGODB_DATA_PATH>/replica/rs1

net:
  bindIp: localhost
  port: 27017

replication:
  replSetName: rs0
```

**Command to create the file:**

```bash
sudo tee /etc/mongod-rs1.conf > /dev/null <<'EOF'
systemLog:
  destination: file
  path: /var/log/mongodb/rs1.log
  logAppend: true

storage:
  dbPath: <MONGODB_DATA_PATH>/replica/rs1

net:
  bindIp: localhost
  port: 27017

replication:
  replSetName: rs0
EOF
```

##### Create rs2.conf (Second Member - Port 27018)

Create `/etc/mongod-rs2.conf`:

```yaml
systemLog:
  destination: file
  path: /var/log/mongodb/rs2.log
  logAppend: true

storage:
  dbPath: <MONGODB_DATA_PATH>/replica/rs2

net:
  bindIp: localhost
  port: 27018

replication:
  replSetName: rs0
```

**Command to create the file:**

```bash
sudo tee /etc/mongod-rs2.conf > /dev/null <<'EOF'
systemLog:
  destination: file
  path: /var/log/mongodb/rs2.log
  logAppend: true

storage:
  dbPath: <MONGODB_DATA_PATH>/replica/rs2

net:
  bindIp: localhost
  port: 27018

replication:
  replSetName: rs0
EOF
```

**⚠️ IMPORTANT:** Make sure `<MONGODB_DATA_PATH>` in both files points at directories that exist and are owned by the `mongodb` user (Step 1).

#### Step 3: Stop the Default MongoDB Service (if any)

**IMPORTANT:** The `mongodb-org` package installs a single default `mongod` service listening on
27017 — it will conflict with `rs1` on the same port.

```bash
# Check for an existing service
systemctl status mongod

# If it's running, stop and disable it
sudo systemctl stop mongod
sudo systemctl disable mongod
```

#### Step 4: Install MongoDB as systemd Services

Create a unit file for each replica set member, based on the distro's existing `mongod.service`
unit but pointing at your own config file.

**Create `/etc/systemd/system/mongod-rs1.service`:**

```bash
sudo tee /etc/systemd/system/mongod-rs1.service > /dev/null <<'EOF'
[Unit]
Description=MongoDB Replica Set Member 1 (rs1)
After=network.target

[Service]
User=mongodb
Group=mongodb
ExecStart=/usr/bin/mongod --config /etc/mongod-rs1.conf
LimitFSIZE=infinity
LimitCPU=infinity
LimitAS=infinity
LimitNOFILE=64000
LimitNPROC=64000
LimitMEMLOCK=infinity
TasksMax=infinity
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```

**Create `/etc/systemd/system/mongod-rs2.service`** the same way, swapping `rs1` for `rs2`
throughout (description, `ExecStart` config path).

Then reload systemd so it picks up the new unit files:

```bash
sudo systemctl daemon-reload
```

#### Step 5: Start the Services

```bash
sudo systemctl start mongod-rs1
sudo systemctl start mongod-rs2

# Verify they're running
systemctl status mongod-rs1 mongod-rs2
```

Both services should show **active (running)**.

#### Step 6: Set Services to Auto-Start on Boot

```bash
sudo systemctl enable mongod-rs1
sudo systemctl enable mongod-rs2
```

#### Step 7: Initialize the Replica Set (ONE-TIME SETUP)

This step connects the two MongoDB instances so they work together as a replica set.

**This only needs to be done once!** The configuration persists after initialization.

Connect with `mongosh`:

```bash
mongosh --port 27017
```

Then run:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "localhost:27017" },
    { _id: 1, host: "localhost:27018" },
  ],
});
```

You should see: `{ ok: 1 }`

#### Step 8: Verify Replica Set Status

In the same `mongosh` session, run:

```javascript
rs.status();
```

You should see both members listed. One will be `PRIMARY` and one will be `SECONDARY`.

### Service Management Commands (Linux)

All commands require `sudo`.

#### Check Service Status

```bash
systemctl status mongod-rs1 mongod-rs2
```

#### Start Services

```bash
sudo systemctl start mongod-rs1 mongod-rs2
```

#### Stop Services

```bash
sudo systemctl stop mongod-rs1 mongod-rs2
```

#### Restart Services

```bash
sudo systemctl restart mongod-rs1 mongod-rs2
```

#### Check Which Ports Are in Use

```bash
ss -tulpn | grep -E "27017|27018"
```

### Troubleshooting (Linux)

#### Error: "This node was not started with replication enabled"

This means you're connected to a MongoDB instance that wasn't started with the replica configuration files.

**Solution:** Make sure the default `mongod` service is stopped and only `mongod-rs1` and `mongod-rs2` are running.

```bash
systemctl status mongod mongod-rs1 mongod-rs2
sudo systemctl stop mongod
```

#### Port Already in Use

**Symptom:** Service fails to start

**Solution:**

1. Check what's using the port: `ss -tulpn | grep 27017`
2. Stop any conflicting MongoDB services
3. Restart the replica set services

#### Service Won't Start

1. Check the logs — either the configured log file or the systemd journal:

   ```bash
   tail -n 50 /var/log/mongodb/rs1.log
   sudo journalctl -u mongod-rs1 -n 50 --no-pager
   ```

2. Ensure data directories exist and are owned by the `mongodb` user (Step 1):

   ```bash
   sudo chown -R mongodb:mongodb <MONGODB_DATA_PATH>/replica
   ```

3. Verify configuration files have correct paths (no `<MONGODB_DATA_PATH>` placeholders remaining!)

4. On a distro with SELinux (RHEL/Fedora/Rocky) or AppArmor (Ubuntu) enabled, check for policy
   denials blocking `mongod` from reading its config or data directory:

   ```bash
   sudo ausearch -m avc -ts recent   # SELinux
   sudo journalctl -u apparmor       # AppArmor
   ```

#### Cannot Initialize Replica Set

**Error:** "already initialized"

**Solution:** The replica set is already configured. Check status with `rs.status()`

#### mongod Not Found

**Error:** "mongod: command not found"

**Solution:** Use the full path (usually `/usr/bin/mongod`), or confirm the install:

```bash
which mongod
dpkg -L mongodb-org-server 2>/dev/null || rpm -ql mongodb-org-server
```

### Uninstalling Services (If Needed)

If you need to remove the services and start over:

```bash
# Stop and disable services
sudo systemctl stop mongod-rs1 mongod-rs2
sudo systemctl disable mongod-rs1 mongod-rs2

# Remove the unit files
sudo rm /etc/systemd/system/mongod-rs1.service
sudo rm /etc/systemd/system/mongod-rs2.service
sudo systemctl daemon-reload

# Optionally remove config and data
sudo rm /etc/mongod-rs1.conf /etc/mongod-rs2.conf
sudo rm -rf <MONGODB_DATA_PATH>/replica
```

### Linux-Specific Notes

- **Path formats:** Linux uses forward slashes `/` in paths.
- **Ownership:** `mongod` typically runs as the `mongodb` system user — data/log directories and
  config files it reads must be owned by (or readable by) that user, or the service will fail to
  start.
- **Spaces in paths:** Uncommon on Linux, but if a path contains a space, quote it in both the
  config file and any shell commands.

## Using the Replica Set

This part is identical on Windows and Linux — only the connection string matters, not the host OS.

### In Your Application Code (Mongoose)

```javascript
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017,localhost:27018/?replicaSet=rs0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
```

### In MongoDB Compass

Connect using:

```
mongodb://localhost:27017/?replicaSet=rs0
```

or

```
mongodb://localhost:27018/?replicaSet=rs0
```

## Important Notes

- **Initialization is one-time only:** After running `rs.initiate()`, the replica set configuration is stored in the database and persists across restarts.

- **Both services must be running:** For full replica set functionality, both members should be running. If one goes down, the other can still serve reads/writes.

- **Connection strings:** Always use the replica set connection string in your applications to take advantage of automatic failover.

- **Backups:** Always backup your data before making changes to the replica set configuration.

## Quick Reference Template

**Replica Set Name:** `rs0`

**Connection String:** `mongodb://localhost:27017,localhost:27018/?replicaSet=rs0`

### Windows

Replace `<MONGODB_INSTALL_PATH>` with your actual path:

| Service Name | Port  | Data Directory                       | Log File                                        |
| ------------ | ----- | ------------------------------------ | ------------------------------------------------ |
| MongoDB-rs1  | 27017 | `<MONGODB_INSTALL_PATH>\replica\rs1` | `<MONGODB_INSTALL_PATH>\replica\rs1\mongod.log` |
| MongoDB-rs2  | 27018 | `<MONGODB_INSTALL_PATH>\replica\rs2` | `<MONGODB_INSTALL_PATH>\replica\rs2\mongod.log` |

**Service Names:** `MongoDB-rs1`, `MongoDB-rs2`

### Linux

Replace `<MONGODB_DATA_PATH>` with your actual path:

| Service Name | Port  | Data Directory                    | Log File                    |
| ------------ | ----- | ---------------------------------- | ---------------------------- |
| mongod-rs1   | 27017 | `<MONGODB_DATA_PATH>/replica/rs1` | `/var/log/mongodb/rs1.log` |
| mongod-rs2   | 27018 | `<MONGODB_DATA_PATH>/replica/rs2` | `/var/log/mongodb/rs2.log` |

**Service Names:** `mongod-rs1`, `mongod-rs2`

---

**Last Updated:** September 17, 2026
