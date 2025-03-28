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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsRDSApi = void 0;
const runtime_1 = require("@ale-run/runtime");
const client_rds_1 = require("@aws-sdk/client-rds"); // ES Modules import
const logger = runtime_1.Logger.getLogger('app:AwsRDSApi');
class AwsRDSApi {
    getClient(region) {
        const config = {
            region
        };
        const client = new client_rds_1.RDSClient(config);
        return client;
    }
    /**
     * stop RDS
     * @param region
     * @param identifier
     * @returns
     */
    stop(region, identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug(`[${identifier}]stop`);
            // check status
            const dbInstances = yield this.describe(region, identifier);
            if (dbInstances.DBInstanceStatus === 'stopped')
                return;
            if (dbInstances.DBInstanceStatus !== 'available')
                throw new Error(`current status is ${dbInstances.DBInstanceStatus}`);
            const client = this.getClient(region);
            const input = {
                DBInstanceIdentifier: identifier,
                // DBSnapshotIdentifier: "STRING_VALUE",
            };
            try {
                const command = new client_rds_1.StopDBInstanceCommand(input);
                const response = yield client.send(command);
                let status = response.DBInstance.DBInstanceStatus;
                logger.info(`[${identifier}]current status=${status}`);
                // Waiting until the status is 'stopped'
                status = yield this.waiting(region, identifier, 'stopped');
                return status;
            }
            catch (err) {
                logger.error('stop Error ===============================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
    /**
     * start RDS
     * @param region
     * @param identifier
     * @returns
     */
    start(region, identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug(`[${identifier}]start`);
            // check status
            const dbInstances = yield this.describe(region, identifier);
            if (dbInstances.DBInstanceStatus === 'available')
                return;
            if (dbInstances.DBInstanceStatus !== 'stopped')
                throw new Error(`current status is ${dbInstances.DBInstanceStatus}`);
            const client = this.getClient(region);
            const input = {
                DBInstanceIdentifier: identifier,
            };
            try {
                const command = new client_rds_1.StartDBInstanceCommand(input);
                const response = yield client.send(command);
                let status = response.DBInstance.DBInstanceStatus;
                logger.info(`[${identifier}]current status=${status}`);
                // Waiting until the status is 'available'
                status = yield this.waiting(region, identifier, 'available');
                return status;
            }
            catch (err) {
                logger.error('start Error ===============================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
        });
    }
    /**
     * describe RDS
     * @param region
     * @param identifier
     * @returns
     */
    describe(region, identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug(`[${identifier}]describe`);
            const client = this.getClient(region);
            const input = {
                DBInstanceIdentifier: identifier,
            };
            try {
                const command = new client_rds_1.DescribeDBInstancesCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    return response.DBInstances[0];
                }
            }
            catch (err) {
                logger.error('start Error ===============================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
            return undefined;
        });
    }
    /**
     * Waiting until the status is 'targetStatus'
     * @param region
     * @param identifier
     * @param targetStatus
     * @returns
     */
    waiting(region, identifier, targetStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            // waiting
            let dbInstance = undefined;
            for (let i = 0; i < 60; i++) {
                yield this.sleep(10000);
                dbInstance = yield this.describe(region, identifier);
                if (dbInstance.DBInstanceStatus === targetStatus)
                    break;
            }
            return dbInstance.DBInstanceStatus;
        });
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.AwsRDSApi = AwsRDSApi;
//# sourceMappingURL=AwsRDSApi.js.map