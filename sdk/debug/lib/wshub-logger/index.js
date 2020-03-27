"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var winston_1 = require("winston");
var myFormat = winston_1.format.printf(function (_a) {
    var level = _a.level, message = _a.message, timestamp = _a.timestamp;
    return timestamp + " " + level + ": " + message;
});
function default_1(level) {
    if (level === void 0) { level = 'info'; }
    return winston_1.createLogger({
        format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.timestamp(), myFormat),
        transports: [
            new winston_1.transports.Console({ level: level }),
        ],
    });
}
exports.default = default_1;
