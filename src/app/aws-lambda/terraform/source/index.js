exports.handler = async function (event, context) {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2));
    const name = event.name || "there"
    const message = `hi '${name}'. we are ale!`
    return message;
};