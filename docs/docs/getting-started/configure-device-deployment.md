---
sidebar_position: 2
---

# Configure Device & Deployment

Currently, the only supported method of configuring your device and deployment
is using balena.

## balenaCloud

This section assumes your device is a ROCK Pi 4B; however, any of the
[devices that balena supports](https://www.balena.io/docs/reference/hardware/devices/)
should work.

### Configure Device

To setup and configure your device using balena, you'll need to create a free
balenaCloud account, create a fleet, and add your device to that fleet.

1. Sign up for an account at https://dashboard.balena-cloud.com/.
2. From the "Fleets" screen, click "Create fleet".
3. Follow the docs at
   https://www.balena.io/docs/learn/getting-started/raspberrypi3/nodejs/#create-a-fleet
   to finish creating your fleet, adding your device, and provisioning your
   device.
4. Follow the remainder of the "Add new device" Instructions section:

   a. Once the device has powered down, remove the SD card from the device.

   b. Power off and power back on the device (by disconnecting and reconnecting
   the power).

   c. Close the "Add new device" screen. You should see your device listed
   under the "Devices" tab, and you should see it's status change to "Online".

   d. **If the device does not shutdown:** This means that setup has not
   completed. Setup should not take more than a few minutes. The most common
   cause of setup not completing is bad WiFi credentials.

   e. **Note for Rock Pi:** balena's instructions specify that the device is
   powered off when the LED is no longer on. The blue LED indicates the device
   is on; the green LED indicates the device is merely plugged in, and so will
   not turn off.

5. Once the device shows up in your fleet dashboard with the status "Online",
   your device should be ready to go.
6. Remember to remove the SD Card from your device once it is set up.

### Configure Your Dev Environment

In order to easily deploy code from your dev environment to your device, you'll
need to install the balena CLI.

1. Continue following the same docs as before to install balena CLI:
   https://www.balena.io/docs/learn/getting-started/raspberrypi3/nodejs/#install-the-balena-cli

### Push a Release

After the CLI is installed, and you have logged in, you can push a release of
SamizdApp to your device.

1. Build the `daemon/next` project:
   ```bash
   cd daemon/next
   npm install
   npm run export
   cd ../../
   ```
2. Build the entire project and push to your device via balenaCloud (expect
   this to take awhile before completing):
   ```
   balena push ${org}/${fleet} -m
   ```
   where `${org}` is the name of your organization, typically your username,
   and `${fleet}` is the name you gave to you fleet. (The full slug of your
   fleet can easily be copied from the fleet Summary page.)
3. Once the push has successfully completed, balena will propagate it to all
   the devices in your fleet. You can monitor this in the dashboard page for
   your device in balenaCloud. Once the release for all services has been
   updated, the deployment is complete. You can monitor the logs for any
   runtime errors.
