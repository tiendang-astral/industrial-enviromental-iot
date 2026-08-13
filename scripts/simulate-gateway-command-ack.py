#!/usr/bin/env python3
"""Giả lập Gateway nhận lệnh relay và trả ACK — dùng để verify DoD Phase 7
(xem PLAN.md § Phase 7, contract ở context/ARCHITECTURE.md § Contract MQTT Command/ACK).

Subscribe gateway/{mac}/command, sau --delay giây publish ACK lên gateway/{mac}/ack.
Dùng paho.mqtt.client (subscribe + publish) thay vì mosquitto_pub/sub — nhất quán với
simulate_full_gateway.py, tránh phải parse JSON bằng jq trong bash.

Usage:
  python3 scripts/simulate-gateway-command-ack.py --mac AA:BB:CC:DD:EE:FF
  python3 scripts/simulate-gateway-command-ack.py --mac AA:BB:CC:DD:EE:FF --delay 3
  python3 scripts/simulate-gateway-command-ack.py --mac AA:BB:CC:DD:EE:FF --nack   # test NACK
  python3 scripts/simulate-gateway-command-ack.py --mac AA:BB:CC:DD:EE:FF --no-ack # test timeout (im lặng)
"""
import argparse
import json
import threading
import time

import paho.mqtt.client as mqtt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mac", required=True)
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=1883)
    parser.add_argument("--delay", type=float, default=1.5, help="Giây chờ trước khi ACK (mô phỏng relay thật)")
    parser.add_argument("--nack", action="store_true", help="Trả NACK thay vì ACK")
    parser.add_argument("--no-ack", action="store_true", help="Không trả ACK gì cả (test timeout worker)")
    args = parser.parse_args()

    command_topic = f"gateway/{args.mac}/command"
    ack_topic = f"gateway/{args.mac}/ack"

    def on_connect(client, userdata, flags, rc, properties=None):
        print(f"Connected (rc={rc}), subscribing {command_topic}")
        client.subscribe(command_topic, qos=1)

    def on_message(client, userdata, msg):
        try:
            command = json.loads(msg.payload.decode())
        except Exception as e:
            print(f"Failed to parse command payload: {e}")
            return
        print(f"Received command: {command}")

        if args.no_ack:
            print("--no-ack set, không trả ACK (mô phỏng gateway offline)")
            return

        def send_ack():
            time.sleep(args.delay)
            ack = {
                "commandId": command.get("commandId"),
                "pinType": command.get("pinType"),
                "pinNumber": command.get("pinNumber"),
                "result": "NACK" if args.nack else "ACK",
                "state": "ON" if command.get("commandType") == "TURN_ON" else "OFF",
            }
            client.publish(ack_topic, payload=json.dumps(ack), qos=1)
            print(f"Published ACK to {ack_topic}: {ack}")

        threading.Thread(target=send_ack, daemon=True).start()

    # Tương thích cả paho-mqtt 1.x (client=... quen thuộc) lẫn 2.x (bắt buộc callback_api_version).
    try:
        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(args.host, args.port)
    print(f"Listening for commands on {command_topic}, will ACK on {ack_topic} (Ctrl+C to stop)")
    client.loop_forever()


if __name__ == "__main__":
    main()
