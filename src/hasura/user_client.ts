import HasuraHttpClient from "./client.js";
import User from "./types/User.js";

export default class UserClient extends HasuraHttpClient {
    private static classInstance?: UserClient;

    private constructor() {
        super()
    }

    public static getInstance() {
        if (!this.classInstance) {
            this.classInstance = new UserClient()
        }
        return this.classInstance
    }

    public getUsers = async () => await this.runQuuery(
        `
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
        `, {})

    public findOne = async (key: string) => await this.runQuuery(
        `
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
                    isVerified
                    password
                }
            }
        `, { key }
    ).then((response) => response).then(({ users }) => users[0])

    public findUserByEmail = async (email: string) => await this.runQuuery(
        `query GetUser($email:String!,$isVerified:Boolean!) {
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
        `, { "email": email, "isVerified": true }
    ).then(response => response).then(({ users }) => users[0])

    public save = async (user: User) => await this.runQuuery(
        ` 
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
        `, { ...user }
    ).then(response => {
        console.log(response)
        return response
    })
        .then(({ insert_users_one }) => {
            console.log(insert_users_one)
            return insert_users_one
        })

    public findUserWithToken = async (pin: string) => {
        const expires = new Date((new Date()).getTime() + 7 * 60000);
        return await this.runQuuery(
            `
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
          `, { pin, expires }
        ).then(response => response)
            .then(({ one_time_pins }) => one_time_pins).
            then(({ user }) => user)
    }

    public verifyUser = async (user: any) => {
        const isVerified = true
        const { user_id } = user
        return await this.runQuuery(
            `
            query FindUserWithToken($user_id:String!,$isVerified:Boolean){
                update_users(where:{user_id:$userd_id},_set:{
                    isVerified:$isVerified
                }){
                    returning{
                        affected_rows
                    }
                }
            
            }
            `, { isVerified, user_id }
        ).then(response => response)
            .then(({ update_users }) => update_users)
            .then(({ affected_rows }) => {
                if (affected_rows > 0) {
                    return true
                }
                return false
            })
    }

    public changePassword = async (user: any) => {
        const { password, user_id } = user
        if (!(password && user_id)) {
            return Promise.reject("user_id and password is  require")
        }
        const { afftected_rows } = await this.runQuuery(
            `
            query FindUserWithToken($user_id:String!,$password:Boolean){
                update_users(where:{user_id:$userd_id},_set:{
                    password:$password
                }){
                    returning{
                        affected_rows
                    }
                }
            
            }
            `, { password, user_id }
        ).then(response => response)
            .then(({ afftected_rows }) => afftected_rows)
        if (afftected_rows > 0) return true
        return false

    }

}