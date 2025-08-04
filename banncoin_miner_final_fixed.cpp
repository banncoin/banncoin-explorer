
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <string>
#include <ctime>
#include <chrono>
#include <thread>
#include <openssl/sha.h>
#include "json.hpp"

using json = nlohmann::json;
using namespace std;

string sha256(const string& input) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_CTX sha256;
    SHA256_Init(&sha256);
    SHA256_Update(&sha256, input.c_str(), input.size());
    SHA256_Final(hash, &sha256);
    stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        ss << hex << setw(2) << setfill('0') << (int)hash[i];
    }
    return ss.str();
}

string format_uptime(time_t launch_time) {
    time_t now = time(nullptr);
    int seconds = static_cast<int>(difftime(now, launch_time));
    int hours = seconds / 3600;
    int minutes = (seconds % 3600) / 60;
    int secs = seconds % 60;
    stringstream ss;
    ss << hours << "h " << minutes << "m " << secs << "s";
    return ss.str();
}

string to_hex(unsigned int value) {
    stringstream hex_stream;
    hex_stream << hex << setw(8) << setfill('0') << value;
    return hex_stream.str();
}

bool is_valid_hash(const string& hash, int difficulty) {
    return hash.substr(0, difficulty) == string(difficulty, '0');
}

string current_timestamp() {
    time_t now = time(0);
    tm* gmtm = gmtime(&now);
    char buf[30];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", gmtm);
    return string(buf);
}

int main(int argc, char* argv[]) {
    time_t launch_time = time(nullptr);
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
    config_file.close();

    string network = config["network"];
    int difficulty = config["difficulty"];
    int block_reward = config["block_reward"];
    string reward_to = config["wallet"];
    int block_height = config["start_height"];

    while (true) {
        string prev_hash = "0000000000000000000000000000000000000000000000000000000000000000";
        if (block_height > 0) {
            string prev_filename = "block" + to_string(block_height - 1) + ".json";
            ifstream prev_file(prev_filename);
            if (prev_file.is_open()) {
                json prev_block;
                prev_file >> prev_block;
                prev_hash = prev_block["hash"];
                prev_file.close();
            }
        }

        json block;
        block["network"] = network;
        block["height"] = block_height;
        block["difficulty"] = difficulty;
        block["reward"] = block_reward;
        block["reward_to"] = reward_to;
        block["timestamp"] = current_timestamp();
        block["prev_hash"] = prev_hash;

        unsigned int nonce = 0;
        string block_data, hash;
        do {
            block["nonce"] = nonce++;
            stringstream ss;
            ss << block["network"] << block["height"] << block["difficulty"]
               << block["reward"] << block["reward_to"]
               << block["timestamp"] << block["prev_hash"]
               << block["nonce"];
            block_data = ss.str();
            hash = sha256(block_data);
        } while (!is_valid_hash(hash, difficulty));

        block["hash"] = hash;

        string filename = "block" + to_string(block_height) + ".json";
        ofstream out_file(filename);
        out_file << setw(4) << block << endl;
        out_file.close();

        cout << "🧠 Banncoin Miner — Final Launch Build" << endl;
        cout << "📡 Network:       "" << network << """ << endl;
        cout << "🔢 Block Height:  " << block_height << endl;
        cout << "🎯 Difficulty:    " << difficulty << endl;
        cout << "💰 Block Reward:  " << block_reward << " BNC" << endl;
        cout << "🕒 Uptime:        " << format_uptime(launch_time) << endl;
        cout << "🧱 Block File:    " << filename << endl;
        cout << "🪙 Rewarded To:   "" << reward_to << """ << endl;
        cout << "🔗 Hash:          "" << hash << """ << endl;
        cout << "⛓️ Previous Hash: "" << prev_hash << """ << endl;
        cout << "---------------------------------------------" << endl;

        block_height++;
        this_thread::sleep_for(chrono::seconds(26));
    }

    return 0;
}
