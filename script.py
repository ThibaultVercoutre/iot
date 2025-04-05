import requests
import time
import random
import base64
import matplotlib.pyplot as plt
TYPES = {
    "vibration": 0,
    "alert": 0,
    "sound": 85  # Valeur initiale moyenne pour le son
}

class Sensor:
    def __init__(self, id, name, type, threshold=None):
        self.id = id
        self.name = name
        self.type = type
        self.pourcentage = 0.5
        self.value = TYPES[type]
        self.threshold = threshold
        self.is_in_alert = False

    
    def generate_next_value(self):
        if self.type == "vibration":
            # Si la valeur est déjà à 1, 50% de chance de repasser à 0
            if self.value == 1:
                if random.random() < self.pourcentage:
                    self.value = 0
            # Sinon 1% de chance d'avoir une vibration
            else:
                if random.random() < 0.005:
                    self.value = 1
                    self.pourcentage = random.uniform(0.4, 0.6)
                
        elif self.type == "alert":
            # Toujours 0
            self.value = 0
            
        elif self.type == "sound":
            # Simulation plus réaliste du son ambiant
            if not hasattr(self, 'peak_duration'):
                self.peak_duration = 0
                
            if self.peak_duration > 0:  # On est dans un pic sonore
                self.peak_duration -= 1
                if self.peak_duration == 0:  # Fin du pic
                    self.pourcentage = random.uniform(0.4, 0.6)
                    sound = random.uniform(-4, -1)  # Commence à redescendre
                else:
                    sound = random.uniform(-1, 1)  # Maintient le niveau élevé
            else:
                # 3% de chance d'avoir un pic sonore
                if random.random() < 0.005:
                    sound = random.uniform(20, 30)  # Pic plus important
                    self.peak_duration = random.randint(5, random.randint(15, 60))  # Durée aléatoire du pic
                else:
                    # Son normal avec tendance à revenir vers 85 dB
                    base_sound = random.uniform(-2, 2)
                    pull_to_mean = (85 - self.value) * 0.1
                    sound = base_sound + pull_to_mean
                    
            new_value = self.value + sound
            
            # Limiter les valeurs extrêmes
            self.value = max(70, min(130, new_value))
            
        return self.value

def create_payload(vibration_value, alert_value, sound_value):
    return {
        "end_device_ids": {
            "device_id": "test-simulate",
            "application_ids": {
            "application_id": "essaie-carte"
            },
            "dev_eui": "A8610A3435446810",
            "join_eui": "0000000000000000"
        },
        "correlation_ids": [
            "as:up:01JQEKGMGSEPJJ0W7RXWQY3H5M",
            "rpc:/ttn.lorawan.v3.AppAs/SimulateUplink:76a2bb81-2ce4-4                                                                                                                                                             1b7-bacd-031cdec6439e"
        ],
        "received_at": "2025-03-28T14:46:50.649008325Z",
        "uplink_message": {
            "f_port": 1,
            "frm_payload": "AAAF3w==",
            "decoded_payload": {
            "36L8JKFN": vibration_value,
            "H3Z9WH2T": alert_value,
            "IBBTZ1QM": sound_value
            },
            "rx_metadata": [
            {
                "gateway_ids": {
                "gateway_id": "test"
                },
                "rssi": 42,
                "channel_rssi": 42,
                "snr": 4.2
            }
            ],
            "settings": {
            "data_rate": {
                "lora": {
                "bandwidth": 125000,
                "spreading_factor": 7
                }
            },
            "frequency": "868000000"
            }
        },
        "simulated": True
    }

def simulate_data(sensors):
    data = {
        "vibration": [],
        "alert": [],
        "sound": []
    }

    nb_data = 1440

    for i in range(nb_data):
        for sensor in sensors:
            sensor.generate_next_value()
            data[sensor.type].append(sensor.value)

    # Créer la figure avec 3 sous-graphiques
    fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(10, 8))
    
    # Configurer les graphiques
    x = range(nb_data)  # 30 points de données
    
    # Graphique des vibrations
    ax1.plot(x, data["vibration"], 'b-')
    ax1.set_title('Vibrations')
    ax1.set_ylabel('Amplitude')
    ax1.grid(True)
    
    # Graphique des alertes
    ax2.plot(x, data["alert"], 'r-')
    ax2.set_title('Alertes')
    ax2.set_ylabel('État')
    ax2.grid(True)
    
    # Graphique du son
    ax3.plot(x, data["sound"], 'g-')
    ax3.set_title('Son')
    ax3.set_ylabel('Niveau')
    ax3.grid(True)
    
    # Ajuster la mise en page
    plt.tight_layout()
    
    # Afficher les graphiques
    plt.show()

def simulate_data_with_payload(sensors):
    data = {
        "vibration": [],
        "alert": [],
        "sound": []
    }

    while True:
        for sensor in sensors:
            sensor.generate_next_value()
            data[sensor.type].append(sensor.value)

        payload = create_payload(data["vibration"][-1], data["alert"][-1], data["sound"][-1])
        send_payload(payload)
        time.sleep(60)  # Attendre 1 minute

def send_payload(payload):
    url = "https://dash.web-gine.fr/api/ttn-webhook"
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    }
    response = requests.post(url, json=payload, headers=headers)
    print(response.json())

def main():
    sensors = [
        Sensor("vibration", "Vibration", "vibration"),
        Sensor("alert", "Alert", "alert"),
        Sensor("sound", "Sound", "sound")
    ]
    # simulate_data(sensors)
    simulate_data_with_payload(sensors)

if __name__ == "__main__":
    main()