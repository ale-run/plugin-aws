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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_1 = require("@ale-run/runtime");
const path_1 = __importDefault(require("path"));
const logger = runtime_1.Logger.getLogger('plugin:aws');
class AWSPlugin extends runtime_1.Plugin {
    install() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`plugin aws is installed`, this.options);
        });
    }
    uninstall() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`plugin aws is uninstalled`, this.options);
        });
    }
    activate() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`plugin aws is activated`, this.options);
            // install apps
            const catalog = yield this.context.getCatalog();
            yield catalog.regist(`${path_1.default.resolve(__dirname, 'app/aws-rds')}`);
            yield catalog.registPreset(`${path_1.default.resolve(__dirname, 'app/aws-rds')}`);
            yield catalog.regist(`${path_1.default.resolve(__dirname, 'app/aws-lambda')}`);
            yield catalog.registPreset(`${path_1.default.resolve(__dirname, 'app/aws-lambda')}`);
            yield catalog.regist(`${path_1.default.resolve(__dirname, 'app/aws-memory-db')}`);
            yield catalog.registPreset(`${path_1.default.resolve(__dirname, 'app/aws-memory-db')}`);
            yield catalog.regist(`${path_1.default.resolve(__dirname, 'app/aws-s3')}`);
            yield catalog.registPreset(`${path_1.default.resolve(__dirname, 'app/aws-s3')}`);
            yield catalog.regist(`${path_1.default.resolve(__dirname, 'app/aws-ec2')}`);
            yield catalog.registPreset(`${path_1.default.resolve(__dirname, 'app/aws-ec2')}`);
            yield catalog.regist(`${path_1.default.resolve(__dirname, 'app/aws-ecs')}`);
            yield catalog.registPreset(`${path_1.default.resolve(__dirname, 'app/aws-ecs')}`);
        });
    }
    deactivate() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info(`plugin aws is deactivated`, this.options);
            const catalog = yield this.context.getCatalog();
            yield catalog.unregist('aws-rds');
            yield catalog.unregistPreset('aws-rds');
            yield catalog.unregist('aws-lambda');
            yield catalog.unregistPreset('aws-lambda');
            yield catalog.unregist('aws-memory-db');
            yield catalog.unregistPreset('aws-memory-db');
            yield catalog.unregist('aws-s3');
            yield catalog.unregistPreset('aws-s3');
            yield catalog.unregist('aws-ec2');
            yield catalog.unregistPreset('aws-ec2');
            yield catalog.unregist('aws-ecs');
            yield catalog.unregistPreset('aws-ecs');
        });
    }
}
exports.default = AWSPlugin;
//# sourceMappingURL=index.js.map