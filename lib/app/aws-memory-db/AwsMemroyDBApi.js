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
exports.AwsMemroyDBApi = void 0;
const runtime_1 = require("@ale-run/runtime");
const client_memorydb_1 = require("@aws-sdk/client-memorydb");
const logger = runtime_1.Logger.getLogger('app:AwsMemroyDBApi');
class AwsMemroyDBApi {
    getClient(region) {
        const config = {
            region
        };
        const client = new client_memorydb_1.MemoryDBClient(config);
        return client;
    }
    describe(region, identifier) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug(`[${identifier}]describe`);
            const client = this.getClient(region);
            const input = {
                ClusterName: identifier,
                ShowShardDetails: true
            };
            try {
                const command = new client_memorydb_1.DescribeClustersCommand(input);
                const response = yield client.send(command);
                if (response.$metadata.httpStatusCode === 200) {
                    return response.Clusters[0];
                }
            }
            catch (err) {
                logger.error('Error ===============================================');
                logger.error(input);
                logger.error(err);
            }
            finally {
                client.destroy();
            }
            return undefined;
        });
    }
}
exports.AwsMemroyDBApi = AwsMemroyDBApi;
//# sourceMappingURL=AwsMemroyDBApi.js.map