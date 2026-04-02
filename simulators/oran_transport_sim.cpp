// IsoBolt O-RAN & Transport Simulator
// TelcoLearn 2026 — Simulates O-RAN component health + optical transport layer
// Compile: g++ -std=c++17 -O2 -o oran_transport_sim oran_transport_sim.cpp -lpthread

#include <iostream>
#include <vector>
#include <string>
#include <random>
#include <chrono>
#include <thread>
#include <cmath>
#include <sstream>
#include <iomanip>
#include <algorithm>

struct OranComponent {
    std::string name;
    double base_load;
    double load;
    int alerts;
    std::string status;
};

struct FiberRing {
    std::string name;
    int km;
    double utilization;
    std::string protection_status;
};

struct DwdmChannel {
    int id;
    double power_dbm;
    double osnr_db;
    bool alert;
};

struct XApp {
    std::string name;
    std::string status; // VERIFIED, SUSPICIOUS, UPDATING
    int e2_cmds_per_sec;
};

class OranTransportSim {
    std::mt19937 rng_;
    int tick_;

    std::vector<OranComponent> oran_components_;
    std::vector<FiberRing> fiber_rings_;
    std::vector<XApp> xapps_;

    std::string escape(const std::string& s) {
        std::string out;
        for (char c : s) {
            if (c == '"') out += "\\\"";
            else out += c;
        }
        return out;
    }

    std::string time_str() {
        auto now = std::chrono::system_clock::now();
        auto t = std::chrono::system_clock::to_time_t(now);
        std::tm tm_buf;
        localtime_r(&t, &tm_buf);
        std::ostringstream oss;
        oss << std::put_time(&tm_buf, "%H:%M:%S");
        return oss.str();
    }

public:
    OranTransportSim()
        : rng_(std::chrono::steady_clock::now().time_since_epoch().count()),
          tick_(0) {
        oran_components_ = {
            {"O-CU-CP", 42, 42, 0, "healthy"},
            {"O-CU-UP", 65, 65, 0, "healthy"},
            {"O-DU",    72, 72, 0, "healthy"},
            {"O-RU",    35, 35, 0, "healthy"},
            {"RIC-Near-RT", 55, 55, 0, "healthy"},
            {"RIC-Non-RT",  30, 30, 0, "healthy"},
            {"SMO",     45, 45, 0, "healthy"}
        };
        fiber_rings_ = {
            {"Mumbai Metro Ring",    420, 70, "protected"},
            {"Pune-Mumbai Backbone", 310, 56, "protected"},
            {"Maharashtra State Ring", 680, 44, "protected"},
            {"Gujarat Extension",    390, 11, "deploying"}
        };
        xapps_ = {
            {"traffic-steering-v3", "VERIFIED", 120},
            {"qos-optimizer-v2",    "VERIFIED", 85},
            {"load-balancer-v1",    "VERIFIED", 60},
            {"slice-scheduler-v4",  "VERIFIED", 95},
            {"anomaly-reporter-v1", "VERIFIED", 45}
        };
    }

    std::string tick() {
        tick_++;
        std::uniform_real_distribution<double> uni(0.0, 1.0);
        std::normal_distribution<double> noise(0.0, 1.0);

        // Update O-RAN components
        for (auto& comp : oran_components_) {
            comp.load = std::clamp(comp.base_load + noise(rng_) * 8.0, 5.0, 98.0);
            comp.alerts = (uni(rng_) < 0.05) ? std::uniform_int_distribution<int>(1, 4)(rng_) : 0;
            comp.status = comp.load > 85 ? "critical" :
                         (comp.load > 75 || comp.alerts > 2) ? "warning" : "healthy";
        }

        // Randomly make O-DU stressed periodically
        if (tick_ % 10 < 3) {
            oran_components_[2].load = std::clamp(78.0 + noise(rng_) * 8.0, 60.0, 95.0);
            oran_components_[2].alerts = std::max(oran_components_[2].alerts, 2);
            oran_components_[2].status = "warning";
        }

        // Update fiber rings
        for (auto& ring : fiber_rings_) {
            if (ring.protection_status == "deploying") {
                ring.utilization = std::clamp(ring.utilization + uni(rng_) * 0.2, 5.0, 25.0);
            } else {
                double base = (ring.name == "Mumbai Metro Ring") ? 70 : (ring.name == "Pune-Mumbai Backbone") ? 56 : 44;
                ring.utilization = std::clamp(base + noise(rng_) * 5.0, 10.0, 95.0);
            }
        }

        // Update xApps — occasionally make one suspicious
        for (auto& app : xapps_) {
            app.e2_cmds_per_sec = std::max(10, (int)(app.e2_cmds_per_sec + noise(rng_) * 15));
            app.status = "VERIFIED";
        }
        if (uni(rng_) < 0.12) {
            int idx = std::uniform_int_distribution<int>(0, 4)(rng_);
            xapps_[idx].status = "SUSPICIOUS";
            xapps_[idx].e2_cmds_per_sec += 300;
        }
        if (uni(rng_) < 0.08) {
            xapps_[4].status = "UPDATING";
        }

        // Generate DWDM channels (80 channels)
        std::vector<DwdmChannel> channels(80);
        int alert_channel = (tick_ % 20 < 5) ? 33 : -1; // λ-34 alert periodically
        for (int i = 0; i < 80; i++) {
            channels[i].id = i + 1;
            channels[i].power_dbm = -2.0 + noise(rng_) * 0.5;
            channels[i].osnr_db = 28.0 + noise(rng_) * 1.5;
            channels[i].alert = (i == alert_channel);
            if (channels[i].alert) {
                channels[i].osnr_db = 24.0 + noise(rng_) * 1.0;
            }
        }

        // E2 interface metrics
        int e2_setup = 120 + std::uniform_int_distribution<int>(-10, 15)(rng_);
        int e2_indication = 3000 + std::uniform_int_distribution<int>(-200, 400)(rng_);
        int e2_control = 800 + std::uniform_int_distribution<int>(-100, 200)(rng_);
        int e2_unauthorized = (uni(rng_) < 0.1) ? std::uniform_int_distribution<int>(1, 3)(rng_) : 0;

        // Optical parameters
        double avg_osnr = 28.0 + noise(rng_) * 0.5;
        double ber = 2.1e-4 + (noise(rng_) * 0.3e-4);
        double cd = 12.8 + noise(rng_) * 0.5;
        double pmd = 0.4 + std::abs(noise(rng_)) * 0.1;
        bool fiber_tap_alert = (tick_ % 15 < 4);

        // Build JSON
        std::ostringstream out;
        out << "{\"tick\":" << tick_
            << ",\"timestamp\":\"" << time_str() << "\"";

        // O-RAN components
        out << ",\"oran_components\":[";
        for (size_t i = 0; i < oran_components_.size(); i++) {
            if (i) out << ",";
            auto& c = oran_components_[i];
            out << "{\"name\":\"" << c.name
                << "\",\"load\":" << std::fixed << std::setprecision(1) << c.load
                << ",\"alerts\":" << c.alerts
                << ",\"status\":\"" << c.status << "\"}";
        }
        out << "]";

        // Fiber rings
        out << ",\"fiber_rings\":[";
        for (size_t i = 0; i < fiber_rings_.size(); i++) {
            if (i) out << ",";
            auto& r = fiber_rings_[i];
            out << "{\"name\":\"" << escape(r.name)
                << "\",\"km\":" << r.km
                << ",\"utilization\":" << std::fixed << std::setprecision(1) << r.utilization
                << ",\"status\":\"" << r.protection_status << "\"}";
        }
        out << "]";

        // xApps
        out << ",\"xapps\":[";
        for (size_t i = 0; i < xapps_.size(); i++) {
            if (i) out << ",";
            auto& x = xapps_[i];
            out << "{\"name\":\"" << x.name
                << "\",\"status\":\"" << x.status
                << "\",\"e2_cmds\":" << x.e2_cmds_per_sec << "}";
        }
        out << "]";

        // DWDM summary (send alert channels + overall stats)
        int alert_count = 0;
        double avg_power = 0;
        for (auto& ch : channels) {
            avg_power += ch.power_dbm;
            if (ch.alert) alert_count++;
        }
        avg_power /= 80.0;

        out << ",\"dwdm\":{\"total_channels\":80"
            << ",\"alert_channels\":" << alert_count
            << ",\"avg_power\":" << std::fixed << std::setprecision(2) << avg_power
            << ",\"avg_osnr\":" << std::fixed << std::setprecision(1) << avg_osnr
            << ",\"alert_channel_id\":" << (alert_channel >= 0 ? alert_channel + 1 : 0)
            << "}";

        // E2 interface
        out << ",\"e2_interface\":{\"setup_active\":" << e2_setup
            << ",\"indication_per_sec\":" << e2_indication
            << ",\"control_per_sec\":" << e2_control
            << ",\"unauthorized_blocked\":" << e2_unauthorized << "}";

        // Optical
        out << ",\"optical\":{\"avg_osnr\":" << std::fixed << std::setprecision(1) << avg_osnr
            << ",\"ber\":" << std::scientific << std::setprecision(2) << ber
            << ",\"chromatic_dispersion\":" << std::fixed << std::setprecision(1) << cd
            << ",\"pmd\":" << std::fixed << std::setprecision(2) << pmd
            << ",\"fiber_tap_alert\":" << (fiber_tap_alert ? "true" : "false")
            << "}";

        out << "}";
        return out.str();
    }
};

int main(int argc, char* argv[]) {
    bool once = false;
    int interval_ms = 2000;
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--once") once = true;
        if (arg == "--interval" && i + 1 < argc) interval_ms = std::stoi(argv[++i]);
    }

    OranTransportSim sim;

    if (once) {
        std::cout << sim.tick() << std::endl;
        return 0;
    }

    while (true) {
        std::cout << sim.tick() << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::milliseconds(interval_ms));
    }
    return 0;
}
