export default async function translateTwitchUser(user: string): Promise<string>{
    if(!user || !window.settings.options.twitch_client_id){
        throw new Error("'User' parameter is required");
    }
    const usersUrl = "https://api.twitch.tv/helix/users?login=" + user;
    let response = await fetch(usersUrl, {
        method: "GET",
        headers: {
            "Client-ID": window.settings.options.twitch_client_id,
            "Authorization": "OAuth "+window.settings.options.twitch_oauth_token
        }
    });
    let userData = await response.json();
    if(userData.data[0]){
        return userData.data[0].id;
    }
    return "";
}