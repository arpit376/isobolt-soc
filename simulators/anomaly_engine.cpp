// IsoBolt Anomaly Detection Engine Simulator
// TelcoLearn 2026 — AI-driven anomaly detection for telecom networks
// Compile: g++ -std=c++17 -O2 -o anomaly_engine anomaly_engine.cpp -lpthread

#include <iostream>
#include <vector>
#include <string>
#include <random>
#include <chrono>
#include <thread>
#include <cmath>
#include <sstream>
#include <iomanip>
#include <mutex>
#include <atomic>
#include <algorithm>

struct TelemetryPoint {
    double timestamp;
    double value;
    std::string source;
    std::string metric;
};

struct Anomaly {
    std::string id;
    double timestamp;
    std::string severity;    // critical, warning, info
    std::string source;
    std::string title;
    std::string mitre_id;
    double confidence;
    std::string details;
};

struct SliceMetrics {
    std::string slice_id;
    std::string name;
    std::string type;
    double throughput_gbps;
    double latency_ms;
    double isolation_score;
    std::string status;
    int active_sessions;
};

// Simple Exponential Moving Average for anomaly baseline
class EMADetector {
    double alpha_;
    double ema_;
    double ema_var_;
    bool initialized_;
    int count_;

public:
    EMADetector(double alpha = 0.1)
        : alpha_(alpha), ema_(0), ema_var_(0), initialized_(false), count_(0) {}

    // Returns z-score of the new value against the running baseline
    double update(double value) {
        count_++;
        if (!initialized_) {
            ema_ = value;
            ema_var_ = 0;
            initialized_ = true;
            return 0.0;
        }
        double diff = value - ema_;
        ema_ = alpha_ * value + (1.0 - alpha_) * ema_;
        ema_var_ = alpha_ * (diff * diff) + (1.0 - alpha_) * ema_var_;
        double stddev = std::sqrt(ema_var_);
        if (stddev < 1e-6) return 0.0;
        return std::abs(diff) / stddev;
    }

    double baseline() const { return ema_; }
    int samples() const { return count_; }
};

// Slice isolation monitor using simple threshold + drift detection
class SliceIsolationMonitor {
    std::vector<double> history_;
    double baseline_;
    int window_;

public:
    SliceIsolationMonitor(int window = 20) : baseline_(99.5), window_(window) {}

    struct Result {
        double isolation_score;
        bool breach_detected;
        double drift;
    };

    Result check(double current_score) {
        history_.push_back(current_score);
        if ((int)history_.size() > window_)
            history_.erase(history_.begin());

        double avg = 0;
        for (auto v : history_) avg += v;
        avg /= history_.size();

        double drift = baseline_ - avg;
        bool breach = current_score < 97.0 || drift > 2.0;

        return { current_score, breach, drift };
    }
};

class IsoBoltEngine {
    std::mt19937 rng_;
    std::vector<EMADetector> detectors_;
    std::vector<SliceIsolationMonitor> slice_monitors_;
    std::atomic<int> alert_counter_;
    int tick_;

    std::string sources_[5] = {
        "5G Core / AMF", "O-RAN / O-DU", "Transport / DWDM",
        "Core / UPF", "RAN / gNB"
    };
    std::string slice_names_[5] = {
        "eMBB-Enterprise", "URLLC-HFT", "mMTC-IoT-Grid",
        "eMBB-Broadband", "URLLC-Edge-DC"
    };
    std::string slice_types_[5] = { "eMBB", "URLLC", "mMTC", "eMBB", "URLLC" };
    double slice_base_throughput_[5] = { 4.2, 1.8, 0.6, 8.1, 2.4 };
    double slice_base_latency_[5] = { 12.0, 0.8, 45.0, 18.0, 1.2 };

    std::string generate_alert_id() {
        int id = alert_counter_.fetch_add(1);
        std::ostringstream oss;
        oss << "ALT-" << std::setfill('0') << std::setw(4) << (7900 + id);
        return oss.str();
    }

    std::string current_time_str() {
        auto now = std::chrono::system_clock::now();
        auto t = std::chrono::system_clock::to_time_t(now);
        std::tm tm_buf;
        localtime_r(&t, &tm_buf);
        std::ostringstream oss;
        oss << std::put_time(&tm_buf, "%H:%M:%S");
        return oss.str();
    }

    std::string escape_json(const std::string& s) {
        std::string out;
        for (char c : s) {
            if (c == '"') out += "\\\"";
            else if (c == '\\') out += "\\\\";
            else out += c;
        }
        return out;
    }

public:
    IsoBoltEngine()
        : rng_(std::chrono::steady_clock::now().time_since_epoch().count()),
          detectors_(10, EMADetector(0.08)),
          slice_monitors_(5),
          alert_counter_(0),
          tick_(0) {}

    // Generate one tick of simulated telemetry + anomaly detection
    std::string tick() {
        tick_++;
        std::uniform_real_distribution<double> uni(0.0, 1.0);
        std::normal_distribution<double> noise(0.0, 1.0);

        // Inject anomaly with ~8% probability per tick
        bool inject_anomaly = uni(rng_) < 0.08;
        int anomaly_source = std::uniform_int_distribution<int>(0, 4)(rng_);

        // Generate telemetry for each source
        std::vector<double> z_scores;
        for (int i = 0; i < 5; i++) {
            double base = 50.0 + 10.0 * std::sin(tick_ * 0.05 + i);
            double val = base + noise(rng_) * 5.0;
            if (inject_anomaly && i == anomaly_source)
                val += 25.0 + noise(rng_) * 10.0;  // spike
            double z = detectors_[i].update(val);
            z_scores.push_back(z);
        }

        // Slice metrics
        std::ostringstream slices_json;
        slices_json << "[";
        for (int i = 0; i < 5; i++) {
            double tp = slice_base_throughput_[i] + noise(rng_) * 0.3;
            double lat = slice_base_latency_[i] + std::abs(noise(rng_)) * 1.0;
            double iso = 99.5 + noise(rng_) * 0.5;
            if (inject_anomaly && i == anomaly_source)
                iso -= 2.0 + uni(rng_) * 2.0;  // degrade isolation
            iso = std::clamp(iso, 90.0, 100.0);

            auto result = slice_monitors_[i].check(iso);
            std::string status = result.breach_detected ? "critical" :
                                 (result.drift > 1.0 ? "warning" : "healthy");

            int sessions = 100 + std::uniform_int_distribution<int>(-20, 40)(rng_);

            if (i > 0) slices_json << ",";
            slices_json << "{"
                << "\"slice_id\":\"S" << (i+1) << "\","
                << "\"name\":\"" << slice_names_[i] << "\","
                << "\"type\":\"" << slice_types_[i] << "\","
                << "\"throughput\":" << std::fixed << std::setprecision(2) << tp << ","
                << "\"latency\":" << std::fixed << std::setprecision(1) << lat << ","
                << "\"isolation\":" << std::fixed << std::setprecision(2) << iso << ","
                << "\"status\":\"" << status << "\","
                << "\"sessions\":" << sessions
                << "}";
        }
        slices_json << "]";

        // Build alerts from z-scores
        std::ostringstream alerts_json;
        alerts_json << "[";
        bool first_alert = true;
        for (int i = 0; i < 5; i++) {
            if (z_scores[i] > 2.5 && detectors_[i].samples() > 5) {
                std::string sev = z_scores[i] > 4.0 ? "critical" :
                                  (z_scores[i] > 3.0 ? "warning" : "info");
                double conf = std::min(99.9, 70.0 + z_scores[i] * 5.0);
                std::string mitre = (i < 2) ? "TA0001" : (i < 4) ? "TA0008" : "TA0007";

                std::string titles[] = {
                    "Unauthorized slice access attempt detected",
                    "Anomalous xApp behavior on Near-RT RIC",
                    "Optical signal anomaly on DWDM channel",
                    "GTP tunnel injection attempt on UPF",
                    "Beamforming pattern deviation at gNB site"
                };

                if (!first_alert) alerts_json << ",";
                first_alert = false;
                alerts_json << "{"
                    << "\"id\":\"" << generate_alert_id() << "\","
                    << "\"time\":\"" << current_time_str() << "\","
                    << "\"severity\":\"" << sev << "\","
                    << "\"source\":\"" << sources_[i] << "\","
                    << "\"title\":\"" << titles[i] << "\","
                    << "\"mitre\":\"" << mitre << "\","
                    << "\"confidence\":" << std::fixed << std::setprecision(1) << conf << ","
                    << "\"z_score\":" << std::fixed << std::setprecision(2) << z_scores[i]
                    << "}";
            }
        }
        alerts_json << "]";

        // Overall engine metrics
        double avg_isolation = 0;
        for (int i = 0; i < 5; i++) avg_isolation += std::clamp(99.5 + noise(rng_) * 0.5, 90.0, 100.0);
        avg_isolation /= 5.0;

        double total_throughput = 0;
        for (int i = 0; i < 5; i++) total_throughput += slice_base_throughput_[i] + noise(rng_) * 0.3;

        int total_anomalies = 0;
        for (auto z : z_scores) if (z > 2.5) total_anomalies++;

        double ai_confidence = 94.0 + uni(rng_) * 5.0;

        // Final JSON output
        std::ostringstream out;
        out << "{"
            << "\"tick\":" << tick_ << ","
            << "\"timestamp\":\"" << current_time_str() << "\","
            << "\"engine\":{\"ai_confidence\":" << std::fixed << std::setprecision(1) << ai_confidence
            << ",\"model_version\":\"v2.7.1\""
            << ",\"total_anomalies\":" << total_anomalies
            << ",\"avg_isolation\":" << std::fixed << std::setprecision(2) << avg_isolation
            << ",\"total_throughput\":" << std::fixed << std::setprecision(1) << total_throughput
            << ",\"mean_detect_ms\":" << std::fixed << std::setprecision(0) << (800 + uni(rng_) * 600)
            << "},"
            << "\"slices\":" << slices_json.str() << ","
            << "\"alerts\":" << alerts_json.str()
            << "}";

        return out.str();
    }
};

int main(int argc, char* argv[]) {
    // Default: continuous mode (prints JSON every interval)
    // --once : print one tick and exit
    // --interval <ms> : set tick interval (default 2000)

    bool once = false;
    int interval_ms = 2000;

    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--once") once = true;
        if (arg == "--interval" && i + 1 < argc) interval_ms = std::stoi(argv[++i]);
    }

    IsoBoltEngine engine;

    // Warm up the detectors with 30 baseline ticks
    for (int i = 0; i < 30; i++) engine.tick();

    if (once) {
        std::cout << engine.tick() << std::endl;
        return 0;
    }

    // Continuous mode — stream JSON lines
    while (true) {
        std::cout << engine.tick() << std::endl;
        std::cout.flush();
        std::this_thread::sleep_for(std::chrono::milliseconds(interval_ms));
    }

    return 0;
}
