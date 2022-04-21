


import HttpClient from "./client";

interface HasuraTokenModel {
    user_id: string
    pin: string
    expires: any
}

export default class TokenClient extends HttpClient {
    private static classInstance?: TokenClient;

    private constructor() {
        super()
    }

    public static getInstance() {
        if (!this.classInstance) {
            this.classInstance = new TokenClient()
        }
        return this.classInstance
    }

    public delete = async (user_id: string, pin: string) => await this.execute(
        `   
        mutation($user_id: String!,$pin:String!) {
            delete_one_time_pins(where:{_and:[{user_id:{_eq:$user_id}},{pin:{_eq:$pin}}]}){
                returning{
                    id
                    user_id
                }
            }
        }
        `, { user_id, pin }
    ).then(response => response)
        .then(({ delete_one_time_pins }) => delete_one_time_pins).then(({ returning }) => {
            console.log(returning)
            const { id, user_id } = returning
            if (user_id && id) return true
            return false
        })

    public save = async (token: HasuraTokenModel) => await this.execute(
        ` 
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
        `, { ...token }
    ).then(response => response)
        .then(({ insert_one_time_pins_one }) => insert_one_time_pins_one)

}