var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import HttpClient from "./client.js";
export default class TokenClient extends HttpClient {
    constructor() {
        super();
        this.delete = (user_id, pin) => __awaiter(this, void 0, void 0, function* () {
            return yield this.execute(`   
        mutation($user_id: String!,$pin:String!) {
            delete_one_time_pins(where:{_and:[{user_id:{_eq:$user_id}},{pin:{_eq:$pin}}]}){
                returning{
                    id
                    user_id
                }
            }
        }
        `, { user_id, pin }).then(response => response)
                .then(({ delete_one_time_pins }) => delete_one_time_pins).then(({ returning }) => {
                console.log(returning);
                const { id, user_id } = returning;
                if (user_id && id)
                    return true;
                return false;
            });
        });
        this.save = (token) => __awaiter(this, void 0, void 0, function* () {
            return yield this.execute(` 
        mutation($user_id: String!,$pin:String!,$expires:timestamp) {
            delete_one_time_pins(where:{user_id:{_eq:$user_id}}){
                returning{
                    id
                }
            }
            insert_one_time_pins_one( object: {user_id:$user_id,pin:$pin,
                expires:$expires}
            ) { 
                id
                user_id
                pin
                created_at
            }
        }
        `, Object.assign({}, token)).then(response => response)
                .then(({ insert_one_time_pins_one }) => insert_one_time_pins_one);
        });
    }
    static getInstance() {
        if (!this.classInstance) {
            this.classInstance = new TokenClient();
        }
        return this.classInstance;
    }
}
