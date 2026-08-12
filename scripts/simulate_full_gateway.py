#!/usr/bin/env python3
"""Giả lập gateway "abcde" (MAC aa:bb:cc:dd:ee:ff, site test2) gửi batch đầy đủ
mọi pin INPUT hiện có 1 lần/chu kỳ (đúng contract MQTT thật, xem ARCHITECTURE.md
§ Flow: Gateway sensor data) — mỗi metric random-walk quanh giá trị khởi điểm
thực tế, không phải giá trị cố định.

Usage: python3 scripts/simulate_full_gateway.py [--interval 5]
"""
import argparse
import json
import random
import time
from datetime import datetime, timezone

import paho.mqtt.publish as publish

MAC = "aa:bb:cc:dd:ee:ff"
TOPIC = f"gateway/{MAC}/data"

# pinNumber: (type, giá trị khởi điểm, biên độ random-walk mỗi chu kỳ, min, max)
CHANNELS = {
    1: ("AI", 25.0, 0.6, -10, 45),      # temperature °C
    2: ("AI", 3.0, 1.0, 0, 25),         # wind_speed m/s
    3: ("AI", 180.0, 15.0, 0, 360),     # wind_direction ° (wrap, xử lý riêng)
    4: ("AI", 20.9, 0.3, 15, 23),       # o2 %VOL
    5: ("AI", 15.0, 3.0, 0, 100),       # nh3 ppm
    6: ("AI", 2.0, 0.5, 0, 50),         # h2s ppm
    7: ("AI", 5.0, 1.0, 0, 50),         # ch4 %LEL
    8: ("AI", 10.0, 3.0, 0, 200),       # co ppm
    9: ("AI", 0.05, 0.02, 0, 1),        # o3 ppm
}
DI_1_HUMIDITY = ("DI", 60.0, 2.0, 30, 90)  # humidity %RH — pin DI/1 đã có sẵn từ trước


def step(value, amplitude, lo, hi, wrap=False):
    value += random.uniform(-amplitude, amplitude)
    if wrap:
        return value % 360
    return max(lo, min(hi, value))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=float, default=5.0)
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=1883)
    args = parser.parse_args()

    state = {pin: cfg[1] for pin, cfg in CHANNELS.items()}
    humidity = DI_1_HUMIDITY[1]

    while True:
        readings = []
        for pin, (ptype, _, amplitude, lo, hi) in CHANNELS.items():
            wrap = pin == 3  # wind_direction
            state[pin] = step(state[pin], amplitude, lo, hi, wrap=wrap)
            readings.append({"type": ptype, "pinNumber": pin, "value": round(state[pin], 1)})

        humidity = step(humidity, DI_1_HUMIDITY[2], DI_1_HUMIDITY[3], DI_1_HUMIDITY[4])
        readings.append({"type": "DI", "pinNumber": 1, "value": round(humidity, 1)})

        payload = json.dumps({
            "measuredAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "readings": readings,
        })
        publish.single(TOPIC, payload=payload, hostname=args.host, port=args.port, qos=1)
        print(f"published {len(readings)} readings: {payload}")
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
