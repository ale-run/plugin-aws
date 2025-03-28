"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsCloudwatchLogApi = void 0;
const runtime_1 = require("@ale-run/runtime");
const client_cloudwatch_logs_1 = require("@aws-sdk/client-cloudwatch-logs");
const logger = runtime_1.Logger.getLogger('app:AwsCloudwatchLogApi');
class AwsCloudwatchLogApi {
    constructor(region, logGroupIdentifier, stream) {
        this.CLIENT_TIMEOUT = 5 * 60 * 1000;
        this.region = region;
        this.logGroupIdentifier = logGroupIdentifier;
        // this.client = this.getClient();
        const config = {
            region: this.region
        };
        this.client = new client_cloudwatch_logs_1.CloudWatchLogsClient(config);
        logger.info(`[LOG][${new Date().toISOString()}]client connect`);
        this.stream = stream;
    }
    /**
     * handle response for startLiveTail
     * @param response
     */
    handleResponseAsync(response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            logger.debug('[LOG]handleResponseAsync');
            try {
                try {
                    for (var _d = true, _e = __asyncValues(response.responseStream), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                        _c = _f.value;
                        _d = false;
                        const event = _c;
                        if (event.sessionStart !== undefined) {
                            logger.info(`[LOG][${this.logGroupIdentifier}]start live tail session`, event.sessionStart);
                        }
                        else if (event.sessionUpdate !== undefined) {
                            for (const logEvent of event.sessionUpdate.sessionResults) {
                                this.resetTimeout();
                                const logDate = new Date(logEvent.timestamp);
                                logger.debug(`[${logDate.toISOString()}] ${logEvent.message}`);
                                // stream write시 ISO Date 사용시 write 되지 않음, 확인 필요 
                                this.stream.write(`[${logDate}] ${logEvent.message}`);
                            }
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            catch (err) {
                logger.error(`[LOG][${this.logGroupIdentifier}]handleResponseAsync Error ==`);
                logger.error(err);
            }
        });
    }
    /**
     * startLiveTail
     * @param logGroupIdentifier
     * @returns
     */
    startLiveTail() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[LOG][${this.logGroupIdentifier}]startLiveTail`);
            const logStreamName = yield this.getLatestLogStreamName(this.logGroupIdentifier);
            if (!logStreamName) {
                return;
            }
            const input = {
                logGroupIdentifiers: [this.logGroupIdentifier],
                logStreamNames: [logStreamName], // 로그 스트림 이름
                // logEventFilterPattern: filterPattern
            };
            try {
                const command = new client_cloudwatch_logs_1.StartLiveTailCommand(input);
                const response = yield this.client.send(command);
                this.resetTimeout();
                this.handleResponseAsync(response);
            }
            catch (err) {
                logger.error(`[LOG][${this.logGroupIdentifier}]startLiveTail Error ==`);
                logger.error(input);
                logger.error(err);
                this.close();
            }
        });
    }
    /**
     * Latest Log Stream Name
     * @param logGroupIdentifier
     * @returns
     */
    getLatestLogStreamName(logGroupIdentifier) {
        return __awaiter(this, void 0, void 0, function* () {
            const input = {
                logGroupIdentifier,
                orderBy: client_cloudwatch_logs_1.OrderBy.LastEventTime, // LastEventTime or LogStreamName
                descending: true,
                limit: 1
            };
            try {
                const command = new client_cloudwatch_logs_1.DescribeLogStreamsCommand(input);
                const response = yield this.client.send(command);
                if (response.logStreams.length > 0) {
                    const latestStream = response.logStreams[0];
                    logger.info(`[LOG][${this.logGroupIdentifier}]LatestLogStreamName: ${latestStream.logStreamName} (Last Event: ${new Date(latestStream.lastEventTimestamp).toISOString()})`);
                    return latestStream.logStreamName;
                }
                else {
                    throw new Error(`[${logGroupIdentifier}]not found log stream!`);
                }
            }
            catch (err) {
                logger.error(`[LOG][${this.logGroupIdentifier}]getLatestLogStreamName Error ==`);
                logger.error(input);
                logger.error(err);
                this.close();
            }
        });
    }
    /**
     * called by handleResponseAsync
     * resetTimeout on log received
     */
    resetTimeout() {
        if (this.timerId)
            clearTimeout(this.timerId);
        this.timerId = setTimeout(() => {
            logger.info(`[LOG][${this.logGroupIdentifier}]timeout (${new Date().toISOString()})`);
            this.stream.write('timeout');
            this.close();
        }, (this.CLIENT_TIMEOUT));
    }
    /**
     * close
     */
    close() {
        logger.info(`[LOG][${this.logGroupIdentifier}]stream & client destroy`);
        this.stream.destroy();
        this.client.destroy();
    }
    /**
     * get Logs
     * last 100 rows
     * @param logGroupIdentifier
     * @param startTime
     * @param endTime
     * @param nextToken
     * @param limit
     * @returns
     */
    getLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`[LOG][${this.logGroupIdentifier}]getLogs`);
            const logStreamName = yield this.getLatestLogStreamName(this.logGroupIdentifier);
            if (!logStreamName) {
                return;
            }
            const input = {
                logGroupIdentifier: this.logGroupIdentifier,
                logStreamName, // 로그 스트림 이름
                // startTime: startTime,
                // endTime: endTime,
                // nextToken: nextToken,
                limit: 100
            };
            try {
                const command = new client_cloudwatch_logs_1.GetLogEventsCommand(input);
                const response = yield this.client.send(command);
                // 로그 출력
                response.events.forEach(event => {
                    logger.debug(`[${new Date(event.timestamp).toISOString()}] ${event.message}`);
                    this.stream.write(`[${new Date(event.timestamp)}] ${event.message}`);
                });
            }
            catch (err) {
                logger.error(`[LOG][${this.logGroupIdentifier}]getLogs Error ==`);
                logger.error(input);
                logger.error(err);
                this.close();
            }
        });
    }
}
exports.AwsCloudwatchLogApi = AwsCloudwatchLogApi;
//# sourceMappingURL=AwsCloudwatchLogApi.js.map