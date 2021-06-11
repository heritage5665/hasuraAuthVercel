var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import HasuraHttpClient from "./client.js";
export default class UserClient extends HasuraHttpClient {
    constructor() {
        super();
        this.getUsers = () => __awaiter(this, void 0, void 0, function* () {
            return yield this.runQuuery(`
         query GetAllUsers {
            users {
                fullname
                    email
                    phone
                    password
                    isVerified
                    passwordResetToken
                    passwordResetExpires
            }
        }
        `, {});
        });
        this.findOne = (key) => __awaiter(this, void 0, void 0, function* () {
            return yield this.runQuuery(`
             query GetUserByKey($key) {
                users(where:_or:[
                    {user_id:{_eq:$key}},
                    {phone:{_eq:$key}},
                    {email:{_eq:$key}},
                ],limit:1) 
                {
                    id
                    user_id
                    email
                    isVerified
                    password
                }
            }
        `, { key }).then((response) => response).then(({ users }) => users[0]);
        });
        this.findUserByEmail = (email) => __awaiter(this, void 0, void 0, function* () {
            return yield this.runQuuery(`query GetUser($email:String!,status:Boolean!) {
                users(where:_and[{email:{_eq:$user_id}}, { isVerified:$status}])
                {
                    user_id
                    email
                    phone
                    isVerified
                    created
                }
            }
        `, { "email": email, "isVerified": true }).then(response => response).then(({ users }) => users[0]);
        });
        this.save = (user) => __awaiter(this, void 0, void 0, function* () {
            return yield this.runQuuery(` 
            mutation CreateUserOne($user_id: String!,$fullname:String!,$email:String!,
                $password:String!,$isVerified:String!,$phone:String,$pin:String!,$expires:timestamp) {
                    insert_users_one(
                        object: {
                                user_id: $user_id,
                                fullname:$fullname,
                                email:$email
                                password:$password,
                                isVerified:$isVerified
                                phone:$phone
                                one_time_pins:{
                                    data:[
                                        {
                                            pin:$pin
                                            expires:$expires
                                        }
                                    ]
                                }
                            }
                    ){
                            user_id
                            created_at
                    }
                }
        `, Object.assign({}, user)).then(response => response)
                .then(({ insert_users_one }) => {
                console.log(insert_users_one);
                return insert_users_one;
            });
        });
        this.findUserWithToken = (pin) => __awaiter(this, void 0, void 0, function* () {
            const expires = new Date((new Date()).getTime() + 7 * 60000);
            return yield this.runQuuery(`
            query FindUserWithToken($token:String!,$expires:timestamp){
                one_time_pins(where:_and:[
                    {pin:{_eq:$pin}},
                    {expires:{_lt:$expires}}
                ],limit:1,order_by:{expires:desc}){
                    user{
                        id 
                        user_id
                        fullname
                        phone
                        password
                        email
                        isVerified
                    }
                }
            }
          `, { pin, expires }).then(response => response)
                .then(({ one_time_pins }) => one_time_pins).
                then(({ user }) => user);
        });
        this.verifyUser = (user) => __awaiter(this, void 0, void 0, function* () {
            const isVerified = true;
            const { user_id } = user;
            return yield this.runQuuery(`
            query FindUserWithToken($user_id:String!,$isVerified:Boolean){
                update_users(where:{user_id:$userd_id},_set:{
                    isVerified:$isVerified
                }){
                    returning{
                        affected_rows
                    }
                }
            
            }
            `, { isVerified, user_id }).then(response => response)
                .then(({ update_users }) => update_users)
                .then(({ affected_rows }) => {
                if (affected_rows > 0) {
                    return true;
                }
                return false;
            });
        });
        this.changePassword = (user) => __awaiter(this, void 0, void 0, function* () {
            const { password, user_id } = user;
            if (!(password && user_id)) {
                return Promise.reject("user_id and password is  require");
            }
            const { afftected_rows } = yield this.runQuuery(`
            query FindUserWithToken($user_id:String!,$password:Boolean){
                update_users(where:{user_id:$userd_id},_set:{
                    password:$password
                }){
                    returning{
                        affected_rows
                    }
                }
            
            }
            `, { password, user_id }).then(response => response)
                .then(({ afftected_rows }) => afftected_rows);
            if (afftected_rows > 0)
                return true;
            return false;
        });
    }
    static getInstance() {
        if (!this.classInstance) {
            this.classInstance = new UserClient();
        }
        return this.classInstance;
    }
}
