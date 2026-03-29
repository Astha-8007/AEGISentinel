from flask import Flask
from flask_socketio import SocketIO
import pandas as pd
import base64
import time
import threading

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

logs = pd.read_csv("data/system_logs.csv")
nodes = pd.read_csv("data/node_registry.csv")
schema = pd.read_csv("data/schema_config.csv")

logs.columns = [c.lower().strip() for c in logs.columns]
nodes.columns = [c.lower().strip() for c in nodes.columns]
schema.columns = [c.lower().strip() for c in schema.columns]

def find_col(df, keywords):
    for col in df.columns:
        for key in keywords:
            if key in col:
                return col
    return df.columns[0]

node_id_col = find_col(nodes, ["node", "id"])
serial_col = find_col(nodes, ["serial"])

log_node_col = find_col(logs, ["node", "ip", "host"])
status_col = find_col(logs, ["status", "code"])
latency_col = find_col(logs, ["time", "latency", "response"])

schema_col = find_col(schema, ["version"])

def decode_serial(encoded):
    try:
        return base64.b64decode(str(encoded)).decode()
    except:
        return "CORRUPT"

node_map = {}
for _, row in nodes.iterrows():
    node_map[str(row[node_id_col])] = decode_serial(row[serial_col])

def detect_threat(status, latency):
    try:
        status = int(status)
        latency = float(latency)
    except:
        return "UNKNOWN"

    if status == 200 and latency > 650:
        return "SHADOW CONTROLLER"
    elif latency > 500:
        return "SLEEPER MALWARE"
    elif status != 200:
        return "ACTIVE ATTACK"
    else:
        return "SAFE"

def stream():
    i = 0

    while True:
        log = logs.iloc[i % len(logs)]

        node = str(log[log_node_col])
        status = log[status_col]
        latency = log[latency_col]

        serial = node_map.get(node, "UNKNOWN")
        threat = detect_threat(status, latency)

        current_schema = schema.iloc[i % len(schema)][schema_col]

        data = {
            "node": node,
            "status": status,
            "latency": latency,
            "serial": serial,
            "threat": threat,
            "schema": current_schema
        }

        socketio.emit("update", data)

        i += 1
        time.sleep(0.7)

@socketio.on("connect")
def connect():
    print("Client connected")

if __name__ == "__main__":
    threading.Thread(target=stream).start()
    socketio.run(app, host="0.0.0.0", port=5000)
