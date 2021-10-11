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
            return yield this.execute(`
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
            return yield this.execute(`
             query GetUserByKey($key:String!) {
                users(where:{
                    _or: [
                        { email: {_eq: $key}},
                        { user_id: {_eq: $key}},
                        { phone: {_eq: $key}}
                    ]
                },limit:1)
                {
                    user_id
                    email
                    user_type
                    isVerified
                    password
                }
            }
        `, { key }).then((response) => response)
                .then(({ users }) => users[0]);
        });
        this.findUserByEmail = (email) => __awaiter(this, void 0, void 0, function* () {
            return yield this.execute(`query GetUser($email:String!,$isVerified:Boolean!) {
                users(where:{
                    _and: [
                        { email: {_eq: $email}},
                        { isVerified: {_eq: $isVerified}}
                    ]
                })
                {
                    user_id
                    email
                    phone
                    isVerified
                }
            }
        `, { "email": email, "isVerified": true }).then(response => response).then(({ users }) => users[0]);
        });
        this.save = (user) => __awaiter(this, void 0, void 0, function* () {
            return yield this.execute(` 
            mutation CreateUserOne($user_id: String!,$fullname:String!,$email:String!,
                $password:String!,$isVerified:Boolean!,$phone:String,
                $pin:String!,$expires:timestamp,$user_type:String!) {
                    insert_users_one(
                        object: {
                                user_id: $user_id,
                                user_type:$user_type,
                                fullname:$fullname,
                                email:$email,
                                password:$password,
                                isVerified:$isVerified,
                                phone:$phone,
                                one_time_pins:{
                                    data:[
                                        {
                                            pin:$pin,
                                            expires:$expires
                                        }
                                    ]
                                }
                            }
                    ){
                            user_id
                            fullname
                            email
                            phone
                            created_at
                    }
                }
        `, Object.assign({}, user)).then(response => {
                return response;
            })
                .then(({ insert_users_one }) => {
                return insert_users_one;
            });
        });
        this.findUserWithToken = (pin) => __awaiter(this, void 0, void 0, function* () {
            return yield this.execute(`
            query FindUserWithToken($pin:String!){
                one_time_pins(where:{pin:{_eq:$pin}},limit:1,order_by:{expires:desc}){
                    expires
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
          `, { pin }).then(response => response)
                .then(({ one_time_pins }) => {
                const { user, expires } = one_time_pins[0];
                const expires_in = (new Date(expires)).getTime();
                const now = (new Date()).getTime();
                if (expires_in > now) {
                    return user;
                }
                return Promise.reject("expired token given");
            });
        });
        this.verifyUser = (user) => __awaiter(this, void 0, void 0, function* () {
            const isVerified = true;
            const { user_id } = user;
            return yield this.execute(`
            mutation VerifyUser($user_id:String!,$isVerified:Boolean!){
                update_users(where:{user_id:{_eq:$user_id}},_set:{
                    isVerified:$isVerified
                }){
                    returning{
                        user_id
                    }
                }
            
            }
            `, { isVerified, user_id })
                .then(response => response)
                .then(({ update_users }) => update_users)
                .then(({ returning }) => {
                const { user_id } = returning;
                if (user_id == user_id) {
                    return isVerified;
                }
                return Promise.reject("error verifying user");
            });
        });
        this.changePassword = (user) => __awaiter(this, void 0, void 0, function* () {
            const { password, user_id } = user;
            if (!(password && user_id)) {
                return Promise.reject("user_id and password is  required");
            }
            return yield this.execute(`
                mutation changeUserPassword($user_id:String!,$password:String!){
                    update_users(where:{user_id:{_eq:$user_id}},_set:{
                        password:$password
                    })
                    {
                        returning{
                            user_id
                        }
                    }
                 }
            `, { password, user_id }).then(response => response)
                .then(({ update_users }) => update_users)
                .catch(errr => Promise.reject(errr));
        });
    }
    static getInstance() {
        if (!this.classInstance) {
            this.classInstance = new UserClient();
        }
        return this.classInstance;
    }
}
