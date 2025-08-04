
#include <iostream>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <chrono>
#include <thread>
#include <filesystem>
#include <nlohmann/json.hpp>
#include <openssl/sha.h>

using json = nlohmann::json;
using namespace std;
namespace fs = std::filesystem;

string current_timestamp() {
    time_t now = time(nullptr);
    tm *gmtm = gmtime(&now);
    char buf[32];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", gmtm);
    return string(buf);
}

string sha256(const string& str) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(str.c_str()), str.size(), hash);
    stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; ++i)
        ss << hex << setw(2) << setfill('0') << (int)hash[i];
    return ss.str();
}

json load_latest_block(int& last_index) {
    last_index = -1;
    string latest_file;
    for (const auto& entry : fs::directory_iterator(".")) {
        string fname = entry.path().filename().string();
        if (fname.rfind("block", 0) == 0 && fname.find(".json") != string::npos) {
            int idx = stoi(fname.substr(5, fname.size() - 10));
            if (idx > last_index) {
                last_index = idx;
                latest_file = fname;
            }
        }
    }
    if (latest_file.empty()) {
        cerr << "No block files found." << endl;
        exit(1);
    }
    ifstream block_file(latest_file);
    json block;
    block_file >> block;
    return block;
}

int main(int argc, char* argv[]) {
    if (argc != 2) {
        cerr << "Usage: ./banncoin_miner_final <config.json>" << endl;
        return 1;
    }

    ifstream config_file(argv[1]);
    if (!config_file.is_open()) {
        cerr << "Error opening config file." << endl;
        return 1;
    }

    json config;
    config_file >> config;

    cout << "\n🚀 Banncoin Miner Initialized" << endl;
    cout << "Network: " << setw(0) << json(config["network"]) << endl;
    cout << "Genesis Hash: " << setw(0) << json(config["genesis_hash"]) << endl;
    cout << "Reward: " << config["reward"] << endl;
    cout << "Difficulty: " << config["difficulty"] << endl;

    while (true) {
        int last_index;
        json prev_block = load_latest_block(last_index);

        int new_index = last_index + 1;
        string prev_hash = prev_block["hash"];

        json new_block;
        new_block["index"] = new_index;
        new_block["timestamp"] = current_timestamp();
        new_block["previous_hash"] = prev_hash;
        new_block["reward_to"] = config["wallet"];
        new_block["amount"] = config["reward"];
        new_block["message"] = "The current’s moving...";
        new_block["transactions"] = json::array();

        int nonce = 0;
        string block_data;
        string hash;
        int difficulty = config["difficulty"];
        string prefix(difficulty, '0');

        do {
            new_block["nonce"] = nonce++;
            block_data = new_block.dump();
            hash = sha256(block_data);
        } while (hash.substr(0, difficulty) != prefix);

        new_block["hash"] = hash;
        stringstream fname;
        fname << "block" << setfill('0') << setw(4) << new_index << ".json";
        ofstream out(fname.str());
        out << setw(4) << new_block << endl;

        cout << "✅ Block " << new_index << " of " << new_index + 1 << " mined: " << fname.str() << endl;
        cout << "🕓 Timestamp: " << new_block["timestamp"] << endl;
        cout << "🪙 Reward:    " << new_block["amount"] << " BNC to " << new_block["reward_to"] << endl;
        cout << "🔗 Hash:      " << new_block["hash"] << endl;
        cout << "⛓️ Prev Hash: " << new_block["previous_hash"] << endl;
        cout << "🧱 Total So Far: " << (new_index * static_cast<int>(config["reward"])) << " BNC" << endl;
        cout << "🧊 Axe:      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓" << endl;
        cout << "---------------------------------------------" << endl;

        this_thread::sleep_for(chrono::seconds(26));
    }
}
