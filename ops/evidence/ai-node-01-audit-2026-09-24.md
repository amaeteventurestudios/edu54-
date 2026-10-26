# ai-node-01 read-only audit — 2026-09-24

## 1. SYSTEM

### `hostnamectl`
```
 Static hostname: ai-node-01
       Icon name: computer-desktop
         Chassis: desktop 🖥️
      Machine ID: 43c551f7c31f43349a5b89633ecba0c0
         Boot ID: 7724ec2531704974860d3002f678d628
Operating System: Ubuntu 26.04.1 LTS
          Kernel: Linux 7.0.0-31-generic
    Architecture: x86-64
 Hardware Vendor: AZW
  Hardware Model: SER
Hardware Version: V1.0
Firmware Version: 5800H604
   Firmware Date: Mon 2024-03-18
    Firmware Age: 2y 6month 1w
```

### `grep -m1 "model name" /proc/cpuinfo; nproc; lscpu | grep -E "Model name|Socket|Core|Thread|MHz"`
```
model name	: AMD Ryzen 7 5800H with Radeon Graphics
16
Model name:                              AMD Ryzen 7 5800H with Radeon Graphics
Thread(s) per core:                      2
Core(s) per socket:                      8
Socket(s):                               1
CPU(s) scaling MHz:                      97%
CPU max MHz:                             4465.2612
CPU min MHz:                             403.4880
```

### `free -h`
```
               total        used        free      shared  buff/cache   available
Mem:            12Gi       3.3Gi       2.0Gi        63Mi       7.2Gi       8.8Gi
Swap:          4.0Gi       880Mi       3.1Gi
```

### `uptime; cat /proc/loadavg`
```
 13:01:04 up 12 days, 13:58,  3 users,  load average: 0.76, 0.56, 0.52
0.76 0.56 0.52 2/968 453778
```

### `sensors 2>&1 || (for z in /sys/class/thermal/thermal_zone*; do echo "$z $(cat $z/type) $(cat $z/temp)"; done)`
```
bash: line 1: sensors: command not found
/sys/class/thermal/thermal_zone0 iwlwifi_1 44000
```

## 2. DISKS

### `lsblk -o NAME,MODEL,SERIAL,SIZE,FSTYPE,LABEL,UUID,MOUNTPOINTS,TRAN,RM | grep -v loop`
```
NAME                      MODEL           SERIAL                                                                                                                     SIZE FSTYPE      LABEL         UUID                                   MOUNTPOINTS                   TRAN   RM
sdb                       SanDisk 3.2Gen1 0401c23ef15fc94ffdf80f02a7cbcee8064cea090f37b5be9d9eb5d6b1a39df59eea000000000000000000005c7a6aeeff9068188155810789a94288  57.3G                                                                                                usb     1
└─sdb1                                                                                                                                                              57.3G ext4        HUNGREE-GOAT  7d12ed26-3a1f-45c6-a1ce-37c5097c3d11   /media/hungree-goat                   1
sdc                       Flash Drive FIT 0361823090000118                                                                                                         119.5G                                                                                                usb     1
└─sdc1                                                                                                                                                             119.5G ext4        REYDIOUS_DATA 2ffee1d1-7192-4b79-a34a-6908b229ee94   /srv/ai-node/storage/reydious         1
nvme0n1                   CT500P3PSSD8    231941EEB3BD                                                                                                             465.8G                                                                                                nvme    0
├─nvme0n1p1                                                                                                                                                            1G vfat                      23B6-96A4                              /boot/efi                     nvme    0
├─nvme0n1p2                                                                                                                                                            2G ext4                      186ec93f-3e41-4c9d-995d-2929387672b7   /boot                         nvme    0
└─nvme0n1p3                                                                                                                                                        462.7G LVM2_member               DiqJb6-2ldm-vccU-l9AZ-mHwn-g0eh-m0egUQ                               nvme    0
  └─ubuntu--vg-ubuntu--lv                                                                                                                                            100G ext4                      9ada4703-b73b-484d-883a-2155864576a0   /                                     0
```

### `blkid | grep -v loop`
```
/dev/mapper/ubuntu--vg-ubuntu--lv: UUID="9ada4703-b73b-484d-883a-2155864576a0" BLOCK_SIZE="4096" TYPE="ext4"
/dev/nvme0n1p3: UUID="DiqJb6-2ldm-vccU-l9AZ-mHwn-g0eh-m0egUQ" TYPE="LVM2_member" PARTUUID="8d0e5271-359e-4589-9254-661bae1c4fed"
/dev/nvme0n1p2: UUID="186ec93f-3e41-4c9d-995d-2929387672b7" BLOCK_SIZE="4096" TYPE="ext4" PARTUUID="94867d0b-22c3-4a65-b8fb-5b4a8ae3d61a"
/dev/nvme0n1p1: UUID="23B6-96A4" BLOCK_SIZE="512" TYPE="vfat" PARTUUID="e663d587-8633-4fb2-9b6f-f48103d73bca"
/dev/sdc1: LABEL="REYDIOUS_DATA" UUID="2ffee1d1-7192-4b79-a34a-6908b229ee94" BLOCK_SIZE="4096" TYPE="ext4" PARTLABEL="primary" PARTUUID="228eb891-5532-44f9-9a82-ec5f8bfe255d"
```

### `findmnt -D | grep -v -E "snap|loop"`
```
SOURCE                            FSTYPE     SIZE   USED  AVAIL USE% TARGET
tmpfs                             tmpfs      2.4G   2.6M   2.4G   0% /run
/dev/mapper/ubuntu--vg-ubuntu--lv ext4      97.9G  33.8G  59.1G  35% /
devtmpfs                          devtmpfs   4.8G      0   4.8G   0% /dev
tmpfs                             tmpfs        6G      0     6G   0% /dev/shm
none                              tmpfs        1M      0     1M   0% /run/credentials/systemd-journald.service
none                              tmpfs        1M      0     1M   0% /run/credentials/systemd-resolved.service
tmpfs                             tmpfs        6G 249.7M   5.8G   4% /tmp
/dev/nvme0n1p2                    ext4       1.9G 183.7M   1.6G   9% /boot
/dev/nvme0n1p1                    vfat         1G   6.3M     1G   1% /boot/efi
none                              tmpfs        1M      0     1M   0% /run/credentials/systemd-networkd.service
tmpfs                             tmpfs      1.2G    12K   1.2G   0% /run/user/1000
none                              tmpfs        1M      0     1M   0% /run/credentials/getty@tty1.service
/dev/sda1                         ext4      56.1G   6.5G  49.6G  12% /media/hungree-goat
/dev/sdb1                         ext4      56.1G   6.5G  49.6G  12% /media/hungree-goat
/dev/sdc1                         ext4     117.1G     2M 111.1G   0% /srv/ai-node/storage/reydious
```

### `cat /etc/fstab`
```
# /etc/fstab: static file system information.
#
# Use 'blkid' to print the universally unique identifier for a
# device; this may be used with UUID= as a more robust way to name devices
# that works even if disks are added and removed. See fstab(5).
#
# <file system> <mount point>   <type>  <options>       <dump>  <pass>
# / was on /dev/ubuntu-vg/ubuntu-lv during curtin installation
/dev/disk/by-id/dm-uuid-LVM-kYVlAecsPbj1poHOKqOYt7V4Wuv7IzQvb9aQXqu7K4O0ZolULxiOU91vpvWTVeB1 / ext4 defaults 0 1
# /boot was on /dev/nvme0n1p2 during curtin installation
/dev/disk/by-uuid/186ec93f-3e41-4c9d-995d-2929387672b7 /boot ext4 defaults 0 1
# /boot/efi was on /dev/nvme0n1p1 during curtin installation
/dev/disk/by-uuid/23B6-96A4 /boot/efi vfat defaults 0 1
/swap.img	none	swap	sw	0	0
UUID=7d12ed26-3a1f-45c6-a1ce-37c5097c3d11 /media/hungree-goat ext4 defaults,nofail 0 2
UUID=2ffee1d1-7192-4b79-a34a-6908b229ee94 /srv/ai-node/storage/reydious ext4 defaults,nofail 0 2
```

### `df -hT | grep -v -E "snap|tmpfs|loop"`
```
Filesystem                        Type      Size  Used Avail Use% Mounted on
/dev/mapper/ubuntu--vg-ubuntu--lv ext4       98G   34G   60G  37% /
efivarfs                          efivarfs  128K   23K  101K  18% /sys/firmware/efi/efivars
/dev/nvme0n1p2                    ext4      2.0G  184M  1.7G  11% /boot
/dev/nvme0n1p1                    vfat      1.1G  6.4M  1.1G   1% /boot/efi
/dev/sdb1                         ext4       57G  6.6G   50G  12% /media/hungree-goat
/dev/sdc1                         ext4      118G  2.1M  112G   1% /srv/ai-node/storage/reydious
```

### `ls -l /dev/disk/by-id`
```
total 0
lrwxrwxrwx 1 root root 10 Sep 11 23:02 dm-name-ubuntu--vg-ubuntu--lv -> ../../dm-0
lrwxrwxrwx 1 root root 10 Sep 11 23:02 dm-uuid-LVM-kYVlAecsPbj1poHOKqOYt7V4Wuv7IzQvb9aQXqu7K4O0ZolULxiOU91vpvWTVeB1 -> ../../dm-0
lrwxrwxrwx 1 root root 15 Sep 11 23:02 lvm-pv-uuid-DiqJb6-2ldm-vccU-l9AZ-mHwn-g0eh-m0egUQ -> ../../nvme0n1p3
lrwxrwxrwx 1 root root 13 Sep 11 23:02 nvme-CT500P3PSSD8_231941EEB3BD -> ../../nvme0n1
lrwxrwxrwx 1 root root 15 Sep 11 23:02 nvme-CT500P3PSSD8_231941EEB3BD-part1 -> ../../nvme0n1p1
lrwxrwxrwx 1 root root 15 Sep 11 23:02 nvme-CT500P3PSSD8_231941EEB3BD-part2 -> ../../nvme0n1p2
lrwxrwxrwx 1 root root 15 Sep 11 23:02 nvme-CT500P3PSSD8_231941EEB3BD-part3 -> ../../nvme0n1p3
lrwxrwxrwx 1 root root 13 Sep 11 23:02 nvme-CT500P3PSSD8_231941EEB3BD_1 -> ../../nvme0n1
lrwxrwxrwx 1 root root 15 Sep 11 23:02 nvme-CT500P3PSSD8_231941EEB3BD_1-part1 -> ../../nvme0n1p1
lrwxrwxrwx 1 root root 15 Sep 11 23:02 nvme-CT500P3PSSD8_231941EEB3BD_1-part2 -> ../../nvme0n1p2
lrwxrwxrwx 1 root root 15 Sep 11 23:02 nvme-CT500P3PSSD8_231941EEB3BD_1-part3 -> ../../nvme0n1p3
lrwxrwxrwx 1 root root 13 Sep 11 23:02 nvme-eui.000000000000000100a0752341eeb3bd -> ../../nvme0n1
lrwxrwxrwx 1 root root 15 Sep 11 23:02 nvme-eui.000000000000000100a0752341eeb3bd-part1 -> ../../nvme0n1p1
lrwxrwxrwx 1 root root 15 Sep 11 23:02 nvme-eui.000000000000000100a0752341eeb3bd-part2 -> ../../nvme0n1p2
lrwxrwxrwx 1 root root 15 Sep 11 23:02 nvme-eui.000000000000000100a0752341eeb3bd-part3 -> ../../nvme0n1p3
lrwxrwxrwx 1 root root  9 Sep 24 10:08 usb-Samsung_Flash_Drive_FIT_0361823090000118-0:0 -> ../../sdc
lrwxrwxrwx 1 root root 10 Sep 24 11:49 usb-Samsung_Flash_Drive_FIT_0361823090000118-0:0-part1 -> ../../sdc1
lrwxrwxrwx 1 root root  9 Sep 18 17:12 usb-USB_SanDisk_3.2Gen1_0401c23ef15fc94ffdf80f02a7cbcee8064cea090f37b5be9d9eb5d6b1a39df59eea000000000000000000005c7a6aeeff9068188155810789a94288-0:0 -> ../../sdb
lrwxrwxrwx 1 root root 10 Sep 18 17:12 usb-USB_SanDisk_3.2Gen1_0401c23ef15fc94ffdf80f02a7cbcee8064cea090f37b5be9d9eb5d6b1a39df59eea000000000000000000005c7a6aeeff9068188155810789a94288-0:0-part1 -> ../../sdb1
```


### `udevadm info -q property -n /dev/sdb1 | grep -E "UDISKS|ID_FS|ID_SERIAL|ID_MODEL"`
```
ID_MODEL=SanDisk_3.2Gen1
ID_MODEL_ENC=\x20SanDisk\x203.2Gen1
ID_MODEL_ID=5581
ID_SERIAL=USB_SanDisk_3.2Gen1_0401c23ef15fc94ffdf80f02a7cbcee8064cea090f37b5be9d9eb5d6b1a39df59eea000000000000000000005c7a6aeeff9068188155810789a94288-0:0
ID_SERIAL_SHORT=0401c23ef15fc94ffdf80f02a7cbcee8064cea090f37b5be9d9eb5d6b1a39df59eea000000000000000000005c7a6aeeff9068188155810789a94288
ID_FS_LABEL=HUNGREE-GOAT
ID_FS_LABEL_ENC=HUNGREE-GOAT
ID_FS_UUID=7d12ed26-3a1f-45c6-a1ce-37c5097c3d11
ID_FS_UUID_ENC=7d12ed26-3a1f-45c6-a1ce-37c5097c3d11
ID_FS_VERSION=1.0
ID_FS_BLOCKSIZE=4096
ID_FS_LASTBLOCK=15022076
ID_FS_SIZE=61530423296
ID_FS_TYPE=ext4
ID_FS_USAGE=filesystem
UDISKS_AUTO=0
```

### `ls /etc/systemd/system | grep -i -E "mount|media|srv"; ls /etc/udev/rules.d; systemctl list-units --type=mount --no-pager | grep -E "media|srv"`
```
snap-core24-1643.mount
snap-core24-2124.mount
snap-hwctl-123.mount
snap-snapd-27710.mount
snap-snapd-27738.mount
snapd.mounts.target.wants
70-snap.snapd.rules
ubuntu--vg-ubuntu--lv.rules
  media-hungree\x2dgoat.mount                                                                            loaded active mounted /media/hungree-goat
  srv-ai\x2dnode-storage-reydious.mount                                                                  loaded active mounted /srv/ai-node/storage/reydious
```


### `find /media/hungree-goat -type f 2>/dev/null | wc -l; df -h /media/hungree-goat | tail -1; ls -la /media/hungree-goat`
```
618
/dev/sdb1        57G  6.6G   50G  12% /media/hungree-goat
total 76
drwxr-xr-x 14 aumanah aumanah  4096 Sep 24 13:01 .
drwxr-xr-x  3 root    root     4096 Sep 18 16:43 ..
drwxrwxr-x  3 aumanah aumanah  4096 Sep 14 18:10 .cache
drwxrwxr-x  2 aumanah aumanah  4096 Sep 12 20:45 animation
drwxrwxr-x  3 aumanah aumanah 12288 Sep 14 13:14 artwork
drwxrwxr-x  2 aumanah aumanah  4096 Sep 12 20:03 fallback
drwxrwxr-x  2 aumanah aumanah  4096 Sep 12 20:03 jingles
drwx------  2 aumanah aumanah 16384 Sep 12 20:01 lost+found
drwxrwxr-x  3 aumanah aumanah  4096 Sep 17 20:53 mixes
drwxrwxr-x  4 aumanah aumanah  4096 Sep 14 10:49 music
drwxrwxr-x  2 aumanah aumanah  4096 Sep 20 21:14 playlists
drwxrwxr-x  2 aumanah aumanah  4096 Sep 18 15:37 skins
drwxrwxr-x  2 aumanah aumanah  4096 Sep 12 20:03 station-ids
drwxrwxr-x 14 aumanah aumanah  4096 Sep 24 11:39 umanah-ai-lab
```

### `ls -laR /media/hungree-goat/umanah-ai-lab | head -60; echo files:; find /media/hungree-goat/umanah-ai-lab -type f | wc -l`
```
/media/hungree-goat/umanah-ai-lab:
total 60
drwxrwxr-x 14 aumanah aumanah 4096 Sep 24 11:39 .
drwxr-xr-x 14 aumanah aumanah 4096 Sep 24 13:01 ..
-rw-rw-r--  1 aumanah aumanah 1255 Sep 24 11:39 README.md
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 apps
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:32 backups
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 curriculum
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 database
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 docker-volumes
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 exports
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 knowledge
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 logs
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:32 models
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 projects
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 services
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 tmp

/media/hungree-goat/umanah-ai-lab/apps:
total 8
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 .
drwxrwxr-x 14 aumanah aumanah 4096 Sep 24 11:39 ..

/media/hungree-goat/umanah-ai-lab/backups:
total 8
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:32 .
drwxrwxr-x 14 aumanah aumanah 4096 Sep 24 11:39 ..

/media/hungree-goat/umanah-ai-lab/curriculum:
total 8
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 .
drwxrwxr-x 14 aumanah aumanah 4096 Sep 24 11:39 ..

/media/hungree-goat/umanah-ai-lab/database:
total 8
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 .
drwxrwxr-x 14 aumanah aumanah 4096 Sep 24 11:39 ..

/media/hungree-goat/umanah-ai-lab/docker-volumes:
total 8
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 .
drwxrwxr-x 14 aumanah aumanah 4096 Sep 24 11:39 ..

/media/hungree-goat/umanah-ai-lab/exports:
total 8
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 .
drwxrwxr-x 14 aumanah aumanah 4096 Sep 24 11:39 ..

/media/hungree-goat/umanah-ai-lab/knowledge:
total 8
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 .
drwxrwxr-x 14 aumanah aumanah 4096 Sep 24 11:39 ..

/media/hungree-goat/umanah-ai-lab/logs:
total 8
drwxrwxr-x  2 aumanah aumanah 4096 Sep 24 11:39 .
drwxrwxr-x 14 aumanah aumanah 4096 Sep 24 11:39 ..

/media/hungree-goat/umanah-ai-lab/models:
total 8
files:
1
```

### `ls -la /srv/ai-node/storage/reydious; find /srv/ai-node/storage/reydious -mindepth 1 -not -path "*/lost+found*" | head; lsblk -no PTTYPE /dev/sdc; udevadm info -q property -n /dev/sdc | grep -E "ID_MODEL=|ID_VENDOR=|ID_SERIAL="`
```
total 24
drwxr-xr-x 3 aumanah aumanah  4096 Sep 24 11:49 .
drwxr-xr-x 3 root    root     4096 Sep 24 11:49 ..
drwx------ 2 root    root    16384 Sep 24 11:49 lost+found
find: ‘/srv/ai-node/storage/reydious/lost+found’: Permission denied
gpt
gpt
ID_VENDOR=Samsung
ID_MODEL=Flash_Drive_FIT
ID_SERIAL=Samsung_Flash_Drive_FIT_0361823090000118-0:0
```

### `findmnt -o TARGET,SOURCE,FSTYPE,OPTIONS -T /media/hungree-goat; findmnt -o TARGET,SOURCE,FSTYPE,OPTIONS -T /srv/ai-node/storage/reydious`
```
TARGET              SOURCE    FSTYPE OPTIONS
/media/hungree-goat /dev/sda1 ext4   rw,relatime,shutdown
/media/hungree-goat /dev/sdb1 ext4   rw,relatime
TARGET                        SOURCE    FSTYPE OPTIONS
/srv/ai-node/storage/reydious /dev/sdc1 ext4   rw,relatime
```

### `grep -E "hungree|reydious" /proc/self/mountinfo; ls /dev/sda* 2>&1`
```
150 47 8:1 / /media/hungree-goat rw,relatime shared:566 - ext4 /dev/sda1 rw,shutdown
272 150 8:17 / /media/hungree-goat rw,relatime shared:576 - ext4 /dev/sdb1 rw
151 47 8:33 / /srv/ai-node/storage/reydious rw,relatime shared:616 - ext4 /dev/sdc1 rw
ls: cannot access '/dev/sda*': No such file or directory
```

### `systemctl cat "media-hungree\x2dgoat.mount" 2>&1 | head -20`
```
# Warning: media-hungree\x2dgoat.mount changed on disk, the version systemd has loaded is outdated.
# This output shows the current version of the unit's original fragment and drop-in files.
# If fragments or drop-ins were added or removed, they are not properly reflected in this output.
# Run 'systemctl daemon-reload' to reload units.
# /run/systemd/generator/media-hungree\x2dgoat.mount
# Automatically generated by systemd-fstab-generator

[Unit]
Documentation=man:fstab(5) man:systemd-fstab-generator(8)
SourcePath=/etc/fstab
Requires=systemd-fsck@dev-disk-by\x2duuid-7d12ed26\x2d3a1f\x2d45c6\x2da1ce\x2d37c5097c3d11.service
After=systemd-fsck@dev-disk-by\x2duuid-7d12ed26\x2d3a1f\x2d45c6\x2da1ce\x2d37c5097c3d11.service
After=blockdev@dev-disk-by\x2duuid-7d12ed26\x2d3a1f\x2d45c6\x2da1ce\x2d37c5097c3d11.target

[Mount]
What=/dev/disk/by-uuid/7d12ed26-3a1f-45c6-a1ce-37c5097c3d11
Where=/media/hungree-goat
Type=ext4
Options=defaults,nofail
```

### `du -h --max-depth=1 /media/hungree-goat 2>/dev/null | sort -h`
```
4.0K	/media/hungree-goat/fallback
4.0K	/media/hungree-goat/jingles
4.0K	/media/hungree-goat/station-ids
16K	/media/hungree-goat/lost+found
16K	/media/hungree-goat/playlists
56K	/media/hungree-goat/umanah-ai-lab
11M	/media/hungree-goat/animation
119M	/media/hungree-goat/artwork
163M	/media/hungree-goat/skins
322M	/media/hungree-goat/.cache
517M	/media/hungree-goat/mixes
5.5G	/media/hungree-goat/music
6.6G	/media/hungree-goat
```

### `du -h --max-depth=2 /media/hungree-goat/music /media/hungree-goat/mixes 2>/dev/null | sort -h | tail -30`
```
4.0K	/media/hungree-goat/music/afrobeats
340M	/media/hungree-goat/mixes/.raw
517M	/media/hungree-goat/mixes
5.5G	/media/hungree-goat/music
5.5G	/media/hungree-goat/music/lofi-afrobeats
```

### `for d in music mixes animation fallback jingles playlists skins station-ids artwork; do echo "$d: $(find /media/hungree-goat/$d -type f | wc -l) files"; done`
```
music: 140 files
mixes: 16 files
animation: 2 files
fallback: 0 files
jingles: 0 files
playlists: 2 files
skins: 48 files
station-ids: 0 files
artwork: 275 files
```

### `ls /media/hungree-goat/music; ls /media/hungree-goat/music/* | head -30; find /media/hungree-goat/music /media/hungree-goat/mixes -type f | sed "s/.*\.//" | sort | uniq -c`
```
afrobeats
lofi-afrobeats
/media/hungree-goat/music/afrobeats:

/media/hungree-goat/music/lofi-afrobeats:
Abamani - Wrapping oneself in the comfort of peace.wav
Abase - Wearing authority with grace.wav
Abelesa - Grounded movements in nature's rhythm.wav
Akode - The essence of new discoveries.wav
Arah - Voices echoing the soul's desires.wav
Banu - Timeless essence of beats.wav
Baraka - Blessings woven into sound.wav
Barife - Gratitude for the love that's given.wav
Binase - Dance emerges at life's rhythmic command.wav
Bonjaro - Melodic brightness.wav
Boras - The strong roots of melody.wav
Bureso - Comforting hug of melodies.wav
Bursa - Opportunities in sound.wav
Chombo - Navigating the wild terrains of sound.wav
Dako - The gentle rise of harmony.wav
Danu - Endless dance of harmony.wav
Demkasa - Conversations of the soul, expressed in movement.wav
Dunia - Worldly sounds.wav
Ekoezi- The vibrant goodness of urban rhythms.wav
Elawe - Whispers of ancestral tales.wav
Fache - Melodic whisper of night.wav
Faraja - Cool, soothing tones.wav
Fenure - Radiant glow of harmony.wav
Fonu - The tranquil waves of sound.wav
Fori - The gentle caress of sound.wav
Furaha - Joyful heartbeats in sound.wav
Gamajeli - The full story a poet tells.wav
    151 wav
      5 webm
```

### `ls /media/hungree-goat/playlists`
```
afrobeats-fallback.m3u
lofi-fallback.m3u
```

### `cat /media/hungree-goat/umanah-ai-lab/README.md`
```
# Umanah AI Lab — runtime storage (on the HUNGREE Goat drive)

Reserved 2026-09-24 during storage-prep phase (Phase 0), per docs/27A-AI-NODE-01-DEPLOYMENT.md.
This subtree lives on the same physical USB drive as the HUNGREE Goat media library
(`/media/hungree-goat`, UUID 7d12ed26-3a1f-45c6-a1ce-37c5097c3d11) but is fully separate
from it — nothing here touches HUNGREE Goat's music/artwork/mixes/etc.

Layout (matches docs/27A-AI-NODE-01-DEPLOYMENT.md):
- `apps/`            — application code/checkouts specific to this runtime
- `services/`         — service-specific state
- `models/`           — model weights / caches
- `curriculum/`       — curriculum content
- `knowledge/`        — indexed knowledge / RAG stores
- `projects/`         — student/teacher project data
- `database/`         — database files
- `docker-volumes/`   — explicit bind-mount targets for containers
- `exports/`          — generated exports
- `backups/`          — local backups before risky operations
- `logs/`             — runtime logs
- `tmp/`              — scratch/temp state

Not yet in use. No application has been installed against this path yet — this is
storage prep only (see docs/27A-AI-NODE-01-DEPLOYMENT.md, "Storage roles").
```

### 2b. HUNGREE Goat drive — detail (SanDisk, `/dev/sdb`)

| Item | Value |
|---|---|
| Device / model | `/dev/sdb1` on SanDisk 3.2Gen1 (USB, removable), 57.3 GiB |
| Filesystem | ext4 |
| Label / UUID | `HUNGREE-GOAT` / `7d12ed26-3a1f-45c6-a1ce-37c5097c3d11` |
| Mount method | **`/etc/fstab`** by UUID → systemd-fstab-generator unit `media-hungree\x2dgoat.mount`. udisks2 automount is **not** used (`UDISKS_AUTO=0`) |
| fstab options | `defaults,nofail 0 2` (live: `rw,relatime`) |
| Used / free | 6.6 GiB used, **50 GiB free (12% used)** |
| Total files | 618 regular files (`find -type f`) |

**Warning (see summary): `/media/hungree-goat` is mounted twice (stacked).** `/proc/self/mountinfo`:
`150 … /media/hungree-goat … ext4 /dev/sda1 rw,shutdown` (stale, device node `/dev/sda1` no longer exists) with a second mount `272 … /dev/sdb1 rw` on top of it.
Also `systemctl cat` reports the generated mount unit "changed on disk, the version systemd has loaded is outdated" (needs `daemon-reload`).

Verbatim mount evidence is in the section-2 block above and here:

```
150 47 8:1  / /media/hungree-goat rw,relatime shared:566 - ext4 /dev/sda1 rw,shutdown
272 150 8:17 / /media/hungree-goat rw,relatime shared:576 - ext4 /dev/sdb1 rw
151 47 8:33 / /srv/ai-node/storage/reydious rw,relatime shared:616 - ext4 /dev/sdc1 rw
```

**Top-level folders (`du -h --max-depth=1`)**

```
4.0K  fallback      4.0K  jingles      4.0K  station-ids
 16K  lost+found     16K  playlists     56K  umanah-ai-lab
 11M  animation     119M  artwork      163M  skins
322M  .cache        517M  mixes        5.5G  music
6.6G  /media/hungree-goat
```

**File counts:** music 140 · mixes 16 (5 `.webm`, under `mixes/.raw` 340 MB) · artwork 275 · skins 48 · animation 2 · playlists 2 · fallback/jingles/station-ids 0.
Extension census of music+mixes: 151 `.wav`, 5 `.webm`.

**Exact folders holding the HUNGREE Goat music**
- `/media/hungree-goat/music/lofi-afrobeats/` — **5.5 GiB, 140 `.wav`** (the entire live library)
- `/media/hungree-goat/music/afrobeats/` — empty (station @afrobeats is intentionally off)
- `/media/hungree-goat/mixes/` — 517 MB (16 files)
- Playlists that hard-code the absolute path: `/media/hungree-goat/playlists/lofi-fallback.m3u` (140 lines, all `/media/hungree-goat/music/lofi-afrobeats/…`), `afrobeats-fallback.m3u` (0 lines)

### 2c. `/media/hungree-goat/umanah-ai-lab/` skeleton

Exists, owner `aumanah:aumanah`, 12 subdirectories (`apps backups curriculum database docker-volumes exports knowledge logs models projects services tmp`) — **all empty**. The subtree contains exactly **1 file: `README.md`** (1255 bytes, "Not yet in use"). So "skeleton exists and is empty" is confirmed apart from that README. `find -type f` → 1.

### 2d. Samsung (`/dev/sdc`) — REYDIOUS_DATA

Samsung Flash Drive FIT, serial `0361823090000118`, 119.5 GiB. Partition table **GPT** (`lsblk PTTYPE=gpt`), `sdc1` **ext4**, label **REYDIOUS_DATA**, UUID `2ffee1d1-7192-4b79-a34a-6908b229ee94`, mounted at `/srv/ai-node/storage/reydious` via fstab (`defaults,nofail`), owner `aumanah`, 111 GiB free (2.1 MiB used = ext4 metadata). Contains only `lost+found` (root-owned, mode 700 — content unreadable without sudo: **needs sudo**, though df shows 2 MiB used, consistent with empty). Confirmed empty.

## 3. HUNGREE GOAT APP

**Code location:** `/home/aumanah/hungree-goat` — **not a git repository** (no `.git`, so no remote/branch). It contains `app/ bin/ data/ docker/ docs/ liquidsoap/ logs/ run/ secrets/ README.md`.
A separate git clone of the public/canonical repo exists at `/home/aumanah/hungree-goat-src/hungreegoat-canonical` (remote `git@github-hungreegoat:amaeteventurestudios/hungreegoat.git`, branch `main`, 5 dirty files) — see section 8.

**How it runs:** systemd **user** units (linger enabled: `Linger=yes`) that launch **Docker containers via shell wrappers** (not compose, not pm2):

| Unit (`~/.config/systemd/user/`) | ExecStart | Container |
|---|---|---|
| `hungree-goat-control.service` | `bin/hgc-control-run.sh` (pre: `hgc-wait-docker.sh`, `hgc-wait-media.sh`) | `hgc-control` (hungree-goat/hgc:latest), API+dashboard on :8090 |
| `hungree-goat-liquidsoap@lofi.service` | `bin/hgc-liquidsoap.sh lofi` | `hg-liq-lofi` (savonet/liquidsoap:v2.4.5), 127.0.0.1:8100, :8105 |
| `hungree-goat-stream@lofi.service` | `bin/hgc-stream-run.sh lofi` | `hgc-stream-lofi` (FFmpeg/VAAPI) |
| `hungree-goat-tunnel.service` | `ssh -NT … -R 127.0.0.1:18090:127.0.0.1:8090 hgtunnel@2.29.28.125` | (host process) reverse tunnel to the VPS |

All `Restart=always` at the unit level; the containers themselves show `RestartPolicy=no` (systemd re-creates them).
Data: SQLite at `hungree-goat/data/hungree-goat.sqlite3` (+ `-wal`/`-shm`), plus `data/broadcast.json`, `data/skins.json`. `sqlite3` CLI is not installed, so I could not inspect the schema for path columns (**not checked**). Path-bearing state I *could* see: the `.m3u` playlists (absolute paths) and `data/skins.json` (skin assets are filenames + remote URLs, no `/media/...` string).
Secrets dir `hungree-goat/secrets/` (names only): `internal.token, live-afrobeats.password, live-lofi.password, ntfy-topic.txt, operator.json (+ .bak), session.key, youtube-afrobeats.env, youtube-lofi.env, youtube-oauth-token.json`. Container env var **names**: `HGC_HOME HGC_MEDIA HGC_HW_BACKEND HGC_VAAPI_DEVICE HGC_CHROMIUM_NO_SANDBOX XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS PLAYWRIGHT_BROWSERS_PATH` (control/stream); `INTERNAL_TOKEN EMERGENCY_DIR STATION LIVE_PORT LIVE_BIND BACKEND_URL FALLBACK_M3U SOCKET_PATH AUDIO_KBPS HARBOR_PORT LIVE_PASSWORD` (liquidsoap). Values not shown.

### Every reference to `/media/hungree-goat`

Code/scripts/docs under `/home/aumanah/hungree-goat` (excluding the runtime log):

```
README.md:10            comment: afrobeats stays off until /media/hungree-goat/music/afrobeats has media
README.md:35            Music: /media/hungree-goat/music/<station>/ · covers: /media/hungree-goat/artwork/
README.md:53            default-track-art … synced to /media/hungree-goat/artwork/default.jpg
app/hgc/config.py:12    MEDIA = Path(os.environ.get("HGC_MEDIA", "/media/hungree-goat"))   <- single source of truth in code (env overridable)
app/hgc/catalog.py:5    docstring: external artwork in /media/hungree-goat/artwork
app/hgc/catalog.py:7    docstring: /media/hungree-goat/artwork/default.jpg
app/hgc/skins.py:13     comment: assets live under /media/hungree-goat/skins/
app/static/pages.js:497 UI text (Video Overlay panel)
app/static/pages.js:1207 UI text: skins stored under /media/hungree-goat/skins/
bin/hgc-wait-media.sh:5,6,9  findmnt check + probe-file write test + error text (also names bin/hgc-usb-repair.sh)
bin/hgc-liquidsoap.sh:23  -v /media/hungree-goat:/media/hungree-goat:ro
bin/hgc-liquidsoap.sh:29  -e FALLBACK_M3U="/media/hungree-goat/playlists/$SID-fallback.m3u"
bin/hgc-liquidsoap.sh:30  -e EMERGENCY_DIR=/media/hungree-goat/fallback
bin/hgc-stream-run.sh:21  -v /media/hungree-goat:/media/hungree-goat
bin/hgc-stream-run.sh:22  -e HGC_MEDIA=/media/hungree-goat
bin/hgc-control-run.sh:39 -v /media/hungree-goat:/media/hungree-goat
bin/hgc-control-run.sh:42 -e HGC_MEDIA=/media/hungree-goat
bin/hgc-usb-repair.sh:7   MNT=/media/hungree-goat        (needs sudo to run; not executed)
bin/hgc-monitor.sh:34     greps /proc/mounts for " /media/hungree-goat " and does a write probe
liquidsoap/station.liq:84 comment: emergency dir
run/liq-lofi.log          24,416 matching lines (runtime log, 18 MB) — every track path played
```

Other places:
- `.env` files: none reference it by name; the path is passed as `HGC_MEDIA` in the `*-run.sh` wrappers.
- systemd units (`/etc/systemd/system`, `~/.config/systemd/user`): **no literal reference** — only via the scripts above. System-level: generated `media-hungree\x2dgoat.mount` from `/etc/fstab` (`/etc/fstab`: `UUID=7d12ed26-… /media/hungree-goat ext4 defaults,nofail 0 2`).
- Crontab (user): **no** references (5 usg-workforce jobs only). `/etc/cron*`: none.
- Compose files: none for HUNGREE Goat (it doesn't use compose). The `usg-grid` compose files don't reference it.
- Playlists on the drive itself: `/media/hungree-goat/playlists/lofi-fallback.m3u` (140 absolute-path lines).
- Other repo docs: `~/projects/umanah-ai-lab/docs/27A-AI-NODE-01-DEPLOYMENT.md:122,128` and `docs/40-DECISION-LOG.md:53`.

**`docker inspect` mounts for the three HUNGREE containers**

```
hgc-control       bind /media/hungree-goat            -> /media/hungree-goat (rw)
                  bind /home/aumanah/hungree-goat     -> /home/aumanah/hungree-goat (rw)
                  bind /run/user/1000                 -> /run/user/1000 (rw)
                  bind ~/.config/hungree-goat/youtube-oauth-client.json -> /run/secrets/hungree-goat/youtube-oauth-client.json (ro)
hgc-stream-lofi   bind /media/hungree-goat            -> /media/hungree-goat (rw)
                  bind /home/aumanah/hungree-goat     -> /home/aumanah/hungree-goat (rw)
hg-liq-lofi       bind /home/aumanah/hungree-goat/liquidsoap -> /liq (ro)
                  bind /media/hungree-goat            -> /media/hungree-goat (ro)
                  bind /home/aumanah/hungree-goat/run -> /run/hg (rw)
```

Important implication: the whole drive root is bind-mounted **rw** into `hgc-control` and `hgc-stream-lofi`, so `/media/hungree-goat/umanah-ai-lab/` is visible (and writable) inside those containers. Because they bind the mount *point* (not a submount-aware path), a re-mount or the stale stacked mount can leave containers seeing an older view (not tested).

## 4. DOCKER

```
docker: client 29.8.0 / server 29.8.0     compose v5.5.1
Mode: ROOTFUL (SecurityOptions = apparmor, seccomp, cgroupns — no "rootless")   cgroup v2
Data-root: /var/lib/docker (on the 100 GiB root LV, not on a USB drive)   storage driver: overlayfs
```

### Containers

| Name | Image | Status | Ports |
|---|---|---|---|
| usg-grid | usg-grid:0.4.1 | Up 19h (healthy) | 127.0.0.1:5280, 192.168.6.233:5280 |
| bot-crossing | usg/bot-crossing:1.0.0 | Up 21h (healthy) | 5274 (internal) |
| hgc-control | hungree-goat/hgc:latest | Up 3d | none published by Docker; host `python` PID owns 0.0.0.0:8090 (probably `--network host`, not verified) |
| hgc-stream-lofi | hungree-goat/hgc:latest | Up 3d | – |
| hg-liq-lofi | savonet/liquidsoap:v2.4.5 | Up 5d | – (127.0.0.1:8100/8105 appear on host) |
| usg-grid-caddy | caddy:2.11.4-alpine | Up 10d | 127.0.0.1:9443 |
| paperclip | usg/paperclip:v2026.831.1 | Up 12d (healthy) | 192.168.6.233:3100 |
| agents-office | usg/agents-office:3.6.1-beta.1 | Up 6h (healthy) | 4520 (internal) |
| usg-docker-proxy | tecnativa/docker-socket-proxy:0.3.0 | Up 12d | 2375 (internal) |

Mounts (all bind mounts; **no named volumes**):

```
usg-grid          ~/.config/usg-grid, ~/.config/usg-grid-notify (rw); ~/usg-workforce/runtime/logs (ro);
                  secret files (ro) under /run/secrets/: hetzner-ro, known_hosts, paperclip-read-key, usg-dgx-observer, usg-grid-telemetry, usg-runtime-token
bot-crossing      ~/projects/usg-grid/data -> /app/data (rw); known_hosts, hetzner-ro, usg-grid-telemetry (ro)
usg-grid-caddy    ~/usg-grid/infra/docker/Caddyfile (ro); /etc/usg-grid/tls (ro)
paperclip         ~/services/paperclip-data -> /paperclip (rw)
agents-office     ~/services/agents-office-data/{brain,data,office.agents.json,office.config.json} (rw)
usg-docker-proxy  /var/run/docker.sock (ro)
hgc-* / hg-liq-*  see section 3
```

**Compose projects**
- `usg-grid` — `/home/aumanah/usg-grid/infra/docker/compose.yaml` (usg-grid, bot-crossing, usg-grid-caddy, agents-office, usg-docker-proxy)
- `docker` (label) — `/home/aumanah/services/paperclip/docker/docker-compose.quickstart.yml` + `docker-compose.override.yml` (paperclip)
- HUNGREE Goat containers: **no compose**, started by the `bin/*.sh` wrappers.

**Volumes:** none. **Networks:** `ai-backend` (br-b04bc907dbbe), `bridge`, `docker_default`, `host`, `none`, `usg-grid_default`, `usg-grid_embedded`.

```
docker system df
Images          26 total / 8 active   17.87GB  (6.804GB reclaimable, 38%)
Containers       9 /  9               18.72MB
Local Volumes    0                    0B
Build Cache      0                    0B
```

**Rootless extras:** `docker-ce-rootless-extras 5:29.8.0` **is installed** (`/usr/bin/dockerd-rootless.sh`, `dockerd-rootless-setuptool.sh`, `rootlesskit`). `uidmap`, `slirp4netns`, `passt/pasta`: **not installed** (`dpkg` shows nothing; `which slirp4netns pasta` empty). So rootless mode could not currently be set up without installing uidmap + a network helper (needs sudo). Docker itself is running rootful.

## 5. SERVICES

**System services running (25):** chrony, containerd, cron, dbus, docker, fwupd, getty@tty1, ModemManager, multipathd, networkd-dispatcher, polkit, rsyslog, snapd, ssh, systemd-journald/-logind/-networkd/-resolved/-udevd, **tailscaled**, **udisks2**, unattended-upgrades, upower, user@1000, wpa_supplicant.
Not present: ollama, caddy, nginx, cloudflared.

**User services running (9):** at-spi-dbus-bus, dbus, gpg-agent, **hermes-gateway** (Hermes Agent Gateway), **hungree-goat-control**, **hungree-goat-liquidsoap@lofi**, **hungree-goat-stream@lofi**, **hungree-goat-tunnel**, ssh-agent. (`loginctl` Linger=yes, so they survive logout.)

**pm2:** not installed.

**User crontab (`crontab -l`)**
```
@reboot sleep 20 && ~/usg-workforce/runtime/start.sh >> …/cron.log 2>&1     # usg-runtime
*/5  * * * * ~/usg-workforce/runtime/start.sh …                             # usg-runtime
*/10 * * * * cd ~/usg-workforce/projection && python3 agents_office_projection.py --env-file ~/.config/usg-workforce/paperclip.env --restart …  # usg-projection
15 1 * * *   ~/usg-workforce/security/offsite-backup.sh                      # usg-offsite-backup
*/5  * * * * cd ~/usg-workforce/runtime && python3 claude_queue_sync.py …    # usg-claude-sync
```
**`/etc/cron*`:** only stock entries (`e2scrub_all`, daily apport/apt-compat/dpkg/logrotate/man-db, weekly man-db). No custom jobs.
**systemd timers (system):** sysstat-collect/rotate/summary, fwupd-refresh, motd-news, update-notifier-download, systemd-tmpfiles-clean, dpkg-db-backup, logrotate, apt-daily(-upgrade), man-db, e2scrub_all. User: launchpadlib-cache-clean.

## 6. NETWORK

```
enp1s0       UP    192.168.6.233/22  (+ IPv6 ULA)         wlo1 DOWN
tailscale0   UP    100.127.44.118/32  fd7a:115c:a1e0::8a2f:2c77
docker0 172.17.0.1/16 (down) · br-2c062a01745b 172.20.0.1/16 (usg-grid_embedded, up) · br-da5df0a6d768 172.21.0.1/16 (docker_default, up)
br-b04bc907dbbe 172.18.0.1/16 (ai-backend, down) · br-ee472568ce87 172.19.0.1/16 (usg-grid_default, down)
```

**Listening (`ss -tulpn`, unprivileged — owner shown only for own processes)**

| Address:port | Process |
|---|---|
| 127.0.0.1:8100, 127.0.0.1:8105 | liquidsoap (HUNGREE Goat audio) |
| 0.0.0.0:8090 | python (HUNGREE Goat control — **listens on all interfaces**) |
| 127.0.0.1:5280 and 192.168.6.233:5280 | usg-grid (docker-proxy) |
| 192.168.6.233:3100 | paperclip |
| 127.0.0.1:9443 | usg-grid-caddy |
| 127.0.0.1:3000 | node (`~/.hermes/node/bin/node …/hermes-agent/scripts/what…` — path truncated in `ps`, probably the Hermes WhatsApp bridge) |
| 172.21.0.1:3310 | python3 (host, bound to docker bridge) |
| 100.127.44.118:443 and [tailscale v6]:443 | no owner shown (needs sudo); on the tailscale IP, likely `tailscale serve` |
| 0.0.0.0:22, [::]:22 | sshd |
| 100.127.44.118:51672, [ts6]:55294 | tailscaled-related |
| 127.0.0.53/54:53, udp 41641, 323 (chrony), 68 (dhcp) | resolved / tailscale / chrony / dhclient |

**8100–8199:** **8100 and 8105 are in use** (liquidsoap). **8200–8299:** nothing. **11434:** nothing (Ollama is not running).

**ufw:** `ERROR: You need to be root` — **needs sudo** (could not read status; `sudo -n` requires interactive auth).

**Tailscale**
```
100.127.44.118  ai-node-01 (this node)     FQDN ai-node-01.tail18624e.ts.net
100.87.180.80   amaetes-imac    macOS  active; direct
100.79.238.73   iphone172       iOS    -
100.93.178.44   spark-aeb0.tail4c833e.ts.net  (different tailnet owner; offline, seen 1h ago)
100.99.107.27   umanah-dataroom linux  -
```
`tailscale ip` → `100.127.44.118`, `fd7a:115c:a1e0::8a2f:2c77`.

**VPS 2.29.28.125:** **not a Tailscale peer** (`tailscale ping 2.29.28.125` → "no matching peer"; no `hetzner-*` tailnet node listed). It **is reachable** over the public internet: ICMP 2/2, avg ~185 ms; and **SSH works read-only** as `hermes-ro` via alias `hetzner-prod` (host reports hostname `hetzner-usg`).
**SSH config aliases (names only):** `github-hungreegoat`, `github-umanah-ai-lab`, `github-usg-grid`, `hetzner-prod` / `hetzner-usg` (→ 2.29.28.125, user `hermes-ro`), `pi-node-01`. (`config.d/`: `hetzner-prod.conf`, `hetzner-prod.conf.bak.20260910164356`, `pi-node-01.conf`, `raspberry-pi.conf.example`, `umanah-ai-lab.conf`.)

**VPS web server config for `ai.umanah.org`:** the VPS runs **nginx/1.24.0** (no Caddy; `/etc/caddy` does not exist). `/etc/nginx/sites-enabled` has 15 entries: `000-default-deny`, `admin-dataroom.stravour.com`, `admin-dataroom.umanahsystems.com`, `api.hungreegoat.com`, `auth.stravour.com`, `auth.umanahsystems.com`, `control.hungreegoat.com`, `crm.umanahsystems.com`, `dataroom.stravour.com`, `dataroom.umanahsystems.com`, `gate.umanahsystems.com`, `mcp.umanahsystems.com`, `pdf.umanahsystems.com`, `projects.umanahsystems.com`, `sign.umanahsystems.com`. **There is no `ai.umanah.org` server block** (grep of `/etc/nginx`, `/etc/caddy`, `/opt` found nothing) even though DNS already resolves `ai.umanah.org → 2.29.28.125`. Requests to it would currently hit `000-default-deny`.

## 7. SOFTWARE PRESENT

| Tool | Version |
|---|---|
| git | 2.53.0 |
| gh | **Not installed** |
| node | v26.8.1 (`~/.local/bin/node`) — also `~/.nvm` and `~/.hermes/node` exist |
| npm | 11.19.0 |
| pnpm | **Not installed** |
| python3 | 3.14.4 (`/usr/bin/python3`) |
| pip / pip3 | **Not installed** |
| uv | **Not installed** |
| docker | 29.8.0 (build 88096ef) |
| docker compose | v5.5.1 |
| ollama | **Not installed** (no binary, no `~/.ollama`, no unit, no image) |
| caddy | **Not installed on host** (runs only as container `caddy:2.11.4-alpine`) |
| nginx | **Not installed on host** (VPS has nginx 1.24.0) |
| sqlite3 (CLI) | **Not installed** |
| chromium / chrome | **Not installed** as system package |
| playwright | Browser bundles present in `~/.cache/ms-playwright` (`chromium-1187`, `webkit-2203`); CLI not installed globally |
| build-essential / gcc | build-essential 12.12ubuntu2.26.04.2 / gcc 15.2.0 / GNU Make 4.4.1 |
| curl | 8.18.0 |

## 8. REPOS

| Path | Remote | Branch | Last commit | Dirty |
|---|---|---|---|---|
| `~/projects/umanah-ai-lab` | `git@github-umanah-ai-lab:amaeteventurestudios/umanah-ai-lab.git` | main | `bc1966b` 2026-09-24 docs: record completed ai-node-01 storage prep… | no |
| `~/usg-grid` (deployed) | `git@github-usg-grid:amaeteventurestudios/usg-grid.git` | feature/usg-city-living-infrastructure | `9d4401f` 2026-09-23 feat(grid): Models control plane, free-only routing health… | no |
| `~/projects/usg-grid` | `https://github.com/amaeteventurestudios/usg-grid.git` (+ upstream `Station-Sciences/bot-crossing`) | usg/phase-1-baseline | `f2f5384` 2026-09-23 fix(nodes): decommission hetzner-01… | **yes (3 files)** |
| `~/hungree-goat-src/hungreegoat-canonical` | `git@github-hungreegoat:amaeteventurestudios/hungreegoat.git` | main | `422a638` 2026-09-23 docs(studio): drop Vercel deployment path… | **yes (5 files)** |
| `~/usg-workforce` | **none (no remote)** | master | `799bb0d` 2026-09-23 audit: count openrouter-free as free… | **yes (5 files)** |
| `~/services/agents-office` | `https://github.com/ajsahni/agents-office.git` | main | `5bfc828` 2026-09-10 Agents Office v3.6.1-beta.1 | no |
| `~/services/paperclip` | `https://github.com/paperclipai/paperclip.git` | detached HEAD | `65ec059bd` 2026-09-01 fix(onboarding)… | yes (1) |
| `~/services/.retired-swarmclaw-20260911-034131` | `https://github.com/swarmclawai/swarmclaw.git` | detached | `ed38ba5` 2026-06-30 ci: raise release job timeout… | yes (1) |
| `~/.hermes/hermes-agent` | `https://github.com/NousResearch/hermes-agent.git` | main | `0e9fc2cc` 2026-09-09 test(process-registry)… | no |
| `~/.nvm` | `https://github.com/nvm-sh/nvm.git` | detached (v0.40.7) | `f0b0c6b` 2026-08-17 v0.40.7 | no |
| `~/.codex/.tmp/plugins` | (marketplace sync) | master | `1dc1958` 2026-09-11 Sync Codex Security 0.1.24… | no |
| `~/hungree-goat` | **not a git repo** | – | – | – |

### umanah-ai-lab

Last 10 commits (all 2026-09-24):
```
bc1966b aumanah                  docs: record completed ai-node-01 storage prep (HUNGREE Goat subtree + Reydious drive)
2441e4e Umanah Systems Group     chore: scaffold project directories
36d31db … 8e4c2f6 … 6294207 … cc5be95 … 8745f3d … fee67b3 … 579ff56 … f34ca73   (same message: "chore: scaffold project directories")
```
Top-level tree: `.env.example .gitignore AGENTS.md CLAUDE.md README.md` + directories `apps/ curriculum/ deployment/ docs/ infrastructure/ packages/ scripts/ services/ tests/ third-party/`. `docs/` has only `00-START-HERE.md`, `27A-AI-NODE-01-DEPLOYMENT.md`, `40-DECISION-LOG.md`. There is **no `ops/` directory and no `ops/AI-NODE-01.md`** (see summary).

### USG Grid — the disk metric on the node card

Repo `/home/aumanah/usg-grid` (compose-deployed; the `~/projects/usg-grid` clone is a different branch).
- **Raw collection (the source of the number):** `scripts/collect-ai-node-01.sh:64-68` — `DISK=$($TO df -B1 --output=size,avail / | tail -1)` (also `scripts/usg-grid-collect:62`, `scripts/collect-hetzner.sh:64`). **It measures `/` only** (root LV: 98 GiB total, ~34 GiB used). Lines 108-109 emit `diskTotalBytes` / `diskAvailBytes`; lines 117+ emit a `filesystems[]` list of all non-tmpfs mounts (which *does* include the USB drives) — but the card does not use it.
- **Normalisation:** `apps/adapters/src/collectors/nodes.mjs`, function `normalize(node, result)` (declared line 353), the `disk:` block at lines ~429-438: `percent = (diskUsedBytes ?? total-avail) / diskTotalBytes * 100`.
- **Severity/warnings:** `assessSeverity(raw, node)` (line 238) → lines 249-263: warns at ≥80% and ≥90% "disk N% full".
- **DGX variant:** `normalizeDgxTelemetry` (line 305-340) reads `raw.disk_root`.
- **Consumers:** `apps/adapters/src/server.mjs:146`, `city.mjs:40`, `topology.mjs:48`, `notify/investigator.mjs:48`, UI `apps/web/src/routes/Runtime.tsx:114`, type in `apps/web/src/lib/api.ts:434,522`.

### HUNGREE Goat repos
See table: `~/hungree-goat-src/hungreegoat-canonical` (public/canonical source, `main` @ `422a638`, dirty: `M apps/control/hgc/dj_orchestrator.py`, untracked `docs/YOUTUBE_OAUTH_HANDOFF.md`, `docs/images/for-businesses-reference-page.png`, `docs/images/hungree-goat-business-og.webp`, `docs/images/menu-bar.png`). The **deployed** copy `~/hungree-goat` is a separate non-git directory, so the two can drift silently.

### Website repo `github.com/amaeteventurestudios/ui`
**Not cloned** — no repo with that remote exists under `~`, and no directory named `ui`. (Closest: `amaeteventurestudios/hungreegoat` in `hungree-goat-src`.) I did not fetch from GitHub.

## 9. GIT IDENTITY

```
global user.name   : (not set)
global user.email  : (not set)
umanah-ai-lab local: user.name = aumanah ; user.email = ifecci@gmail.com
core.sshCommand    : (not set)
remote origin      : git@github-umanah-ai-lab:amaeteventurestudios/umanah-ai-lab.git
```
Deploy-key SSH alias: **`github-umanah-ai-lab`** (`~/.ssh/config.d/umanah-ai-lab.conf`: `HostName github.com`, `User git`, `IdentitiesOnly yes`, dedicated `IdentityFile` — path/contents not shown).
`git ls-remote origin` **works**: `bc1966b083d004c6b2a97cf136fc401f770ccfb1  refs/heads/main` (HEAD matches local — in sync).
Note: the 9 "Umanah Systems Group" scaffold commits use a different author name than the local `aumanah` identity, so they came from a different clone/committer.

## 10. RESOURCES

Free RAM now: `free -h` → **12 GiB total, 3.3 GiB used, 1.5 GiB free, 7.6 GiB cache, 8.8 GiB available**; swap 880 MiB of 4 GiB used.

Top 10 by RAM:
```
  PID USER     %MEM   RSS(KB) %CPU COMMAND
 2519 aumanah   4.2  532520   2.8  MainThread   (thread name only; process not identified)
449989 aumanah  3.1  398220   8.5  claude
2572378 aumanah 1.9  243340   0.2  python        (HUNGREE Goat control, :8090)
 1744 root      1.8  236472   1.6  dockerd
462817 aumanah  1.7  218004  10.6  ffmpeg
 1817 aumanah   1.6  207680   0.7  hermes
4044048 aumanah 1.2  158092  15.8  ffmpeg
  673 root      1.1  147128   0.0  systemd-journal
 2817 aumanah   0.8  106792   0.0  node-MainThread
1703243 aumanah 0.8  102840   1.0  node
```
Top 10 by CPU: ffmpeg 15.8% · ffmpeg 10.6% · liquidsoap 8.6% · claude 8.5% · python 4.8% · MainThread 2.8% · containerd 1.8% (1.6 dockerd) · node 1.0% · hermes 0.7%.
Per container (`docker stats`, snapshot): usg-grid 49 MiB/512, bot-crossing 25/512, hgc-control 227/768, **hgc-stream-lofi 246/640 (35% CPU)**, hg-liq-lofi 339/512 (8.5%), usg-grid-caddy 19/128, **paperclip 648 MiB (limit 12 GiB = unlimited)**, agents-office 20/768, usg-docker-proxy 4/64.
Load average 0.76 / 0.56 / 0.52 on 16 threads. Temperature: no `sensors` installed; the only thermal zone is Wi-Fi (`iwlwifi_1` 44 °C) — **no CPU/NVMe temperature available**.

## 11. SUMMARY

### Key facts

| Item | Value |
|---|---|
| Host | ai-node-01, AZW SER (Ryzen 7 5800H, 8c/16t), 12 GiB RAM + 4 GiB swap, Ubuntu 26.04.1 LTS, kernel 7.0.0-31, up 12 d |
| OS disk | Crucial CT500P3PSSD8 NVMe 465.8 GiB; **only a 100 GiB LV is used for `/`** (34 GiB used, 59 GiB free); the LVM PV is 462.7 GiB, so **~360 GiB is unallocated in the VG (not verified — needs sudo `vgs`)** |
| HUNGREE Goat drive | `/dev/sdb1` SanDisk 57.3 GiB, ext4, `HUNGREE-GOAT`, UUID `7d12ed26-3a1f-45c6-a1ce-37c5097c3d11`, fstab `defaults,nofail` → `/media/hungree-goat`; 6.6 GiB used, **50 GiB free**; 618 files |
| Music | `/media/hungree-goat/music/lofi-afrobeats/` — 140 WAV, 5.5 GiB; `afrobeats/` empty |
| `umanah-ai-lab` subtree | exists, 12 empty dirs + 1 `README.md` |
| Reydious drive | `/dev/sdc1` Samsung FIT 119.5 GiB, GPT, ext4, `REYDIOUS_DATA`, UUID `2ffee1d1-…`, `/srv/ai-node/storage/reydious`, 111 GiB free, empty |
| HUNGREE Goat path refs | 13 code/script files (`hungree-goat/`), 3 bind mounts (`hgc-control`, `hgc-stream-lofi`, `hg-liq-lofi`), 1 fstab line, 140 lines in `lofi-fallback.m3u`, 3 doc lines in umanah-ai-lab. Crontab/systemd/compose: none |
| Docker | rootful, 29.8.0, compose 5.5.1, data-root `/var/lib/docker` (root LV), 9 containers, 0 volumes, images 17.9 GB (6.8 GB reclaimable); rootless extras installed but no uidmap/slirp4netns/pasta |
| Ports in use | 22, 53, 443 (tailscale), 3000 (127.0.0.1), 3100 (LAN), **8090 (0.0.0.0)**, **8100, 8105 (127.0.0.1)**, 5280 (127.0.0.1 + LAN), 9443 (127.0.0.1), 3310 (172.21.0.1). Free: 8101-8199 except 8105, all of 8200-8299, 11434 |
| Tailscale | this node `ai-node-01` / `ai-node-01.tail18624e.ts.net` / `100.127.44.118`; peers: amaetes-imac, iphone172, spark-aeb0 (other owner), umanah-dataroom |
| VPS 2.29.28.125 | reachable via public IP (ICMP ~185 ms) and read-only SSH (`hetzner-prod`, user `hermes-ro`); **not on the tailnet**; nginx (no Caddy); no `ai.umanah.org` vhost yet, but DNS already points at it |
| Software gaps | gh, pnpm, pip, uv, ollama, sqlite3 CLI, system chromium, host caddy/nginx (all "Not installed"); `sensors` |
| Unreadable without sudo | ufw status, `lost+found` on both drives, LVM/VG free space, `journalctl` system logs, full `ss` owners for root processes |

### Surprising / risky / contradicting docs

1. **Stacked duplicate mount on `/media/hungree-goat`.** A stale `/dev/sda1` mount (device node gone, flagged `shutdown`) sits underneath the live `/dev/sdb1` mount, and systemd reports the generated mount unit as changed/out of date (needs `daemon-reload`). Likely left from the Sep 18 re-enumeration (by-id links for sdb are dated Sep 18). It works today, but it can confuse `umount`, the monitor script, and containers' bind views. Do not "fix" it without a plan; it needs sudo.
2. **Both USB drives are `/dev/sdX` names that changed once already** (sda→sdb). fstab uses UUID, so that is fine, but any script using `/dev/sdb` would break. Docs correctly cite UUIDs.
3. **`umanah-ai-lab` runtime data will live on the same USB stick as the live radio stream.** The whole drive is bind-mounted **rw** into `hgc-control` and `hgc-stream-lofi`, and the stick is USB 3.2 flash. Heavy I/O from models/DB there could cause audio underruns or a mount failure that takes the station down. (Docs already state this is deliberate; risk is worth restating.) The hgc wrappers also do write-probes on the mount.
4. **Docker data-root and OS are on the 100 GiB root LV** (60 GiB free); images already 17.9 GB. Model weights/DBs planned for the USB drives won't relieve Docker's own growth. The NVMe seems to have ~360 GiB unallocated (verify with sudo).
5. **The USG Grid node-card disk % measures only `/`** (`collect-ai-node-01.sh:64`), so it will never reflect the HUNGREE-GOAT drive (12%) or Reydious. It also can't warn if the USB drive fills.
6. **`ops/AI-NODE-01.md` does not exist** in umanah-ai-lab — the task text referenced it; the repo only has `docs/00-START-HERE.md`, `27A-AI-NODE-01-DEPLOYMENT.md`, `40-DECISION-LOG.md`. (An unrelated `~/ai-node-ops/` folder exists in the home dir.)
7. **Ollama is gone.** My own memory notes and `~/LOCAL_AI_STACK_STATUS.md` (verified 2026-09-10) describe Hermes → Ollama (`qwen3:4b-instruct`). Today there is no Ollama binary, service, image or data dir, and `~/.hermes/config.yaml` uses `provider: openrouter` with model `thinkingmachines/inkling:free` (`ollama_num_ctx: 65536` is a leftover). Nothing listens on 11434, so any plan that assumes a local Ollama will be wrong. (Config *keys* only were read; no key values.)
8. **HUNGREE Goat containers have `RestartPolicy=no`**; resilience depends entirely on the systemd user units + linger (which are enabled and working). `hgc-control`'s port `:8090` binds **0.0.0.0** (all interfaces, incl. LAN) rather than loopback/tailnet.
9. **`~/hungree-goat` (deployed) is not under git** and its `secrets/` directory sits inside the app tree; the source of truth is the separate `hungree-goat-src/hungreegoat-canonical` clone (5 uncommitted changes, including a Python file modification). Drift risk.
10. **`~/usg-workforce` has no git remote** (5 uncommitted changes) yet drives cron jobs and an offsite backup; `~/projects/usg-grid` also has 3 uncommitted files and is on a different branch than the deployed `~/usg-grid`.
11. **`ai.umanah.org` resolves to the VPS but nginx has no server block for it** (only `000-default-deny`). The VPS uses **nginx, not Caddy**, if the docs assume Caddy, they should be revisited.
12. **The VPS is not on the Tailscale network**, so "private Tailscale path" from Hetzner to this node (docs §Tailscale path) is not available today; the existing HUNGREE tunnel uses an SSH reverse tunnel (`-R 18090`) instead.
13. **Global git identity is unset**, and the 9 scaffold commits are authored by "Umanah Systems Group" while the latest is `aumanah` — mixed authorship. Possibly intentional; flagging only.
14. **`docker-ce-rootless-extras` is installed but rootless prerequisites are not**, and `usg-docker-proxy` exposes the Docker socket (read-only proxy) — the daemon is rootful, and user `aumanah` effectively has root-equivalent power via docker (not verified: group membership).
15. **paperclip has no memory limit** (12 GiB "limit" on a 12 GiB host; currently 648 MiB) on a machine with 8.8 GiB available and 880 MiB swapped.
16. **No CPU/NVMe temperature sensors** are readable (lm-sensors not installed); this box runs FFmpeg 24/7.
17. **`hgc-stream-lofi` is the top CPU consumer (35%)** and two ffmpeg processes run (15.8% and 10.6%) — one may be a second stream or a stale child; not investigated.
18. Everything else in the docs (device identities, UUIDs, GPT/ext4/labels, fstab lines, skeleton layout, `git ls-remote` sync at `bc1966b`) **matched** reality.

### Audit self-disclosure (please read)

- **One accidental change was made and reverted.** While checking versions I ran `npx playwright --version`; npx auto-downloaded `playwright@1.63.0` into a brand-new `~/.npm/_npx/` cache (19 MB). That dir did not exist before my command (created 13:01:57 PDT). I deleted exactly that path (`rm -rf ~/.npm/_npx`) immediately. Residue: a small npm debug log in `~/.npm/_logs/` (`2026-09-24T20_01_56_626Z-debug-0.log`), which npm writes on every invocation. No system or package-manager state was touched.
- Read-only side effects that remain: `git status`/`git log` may have refreshed `.git/index` timestamps in the repos listed; `git ls-remote` and `ssh hetzner-prod` opened outbound connections (read-only); `ping`/`tailscale ping` sent a few packets. No sudo used; all sudo-requiring items are marked "needs sudo".
- No secrets printed: `secrets/`, `.env`, env values and key contents were listed by **name only**.


## Correction (added later the same day)

Sections 6 and 11 said the VPS is **not on Tailscale**. That was wrong: the VPS (`hetzner-usg`, 2.29.28.125) is the tailnet node **`umanah-dataroom`** (`100.99.107.27`). My check searched for a peer named after the host and `tailscale ping 2.29.28.125` cannot match a peer by its public IP. Verified afterwards: `tailscale ping umanah-dataroom` → pong in 190 ms, and the VPS can reach `100.127.44.118`.
