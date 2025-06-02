import {APIGatewayProxyHandlerV2, APIGatewayProxyResultV2} from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async(
    event
): Promise<APIGatewayProxyResultV2> => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({message: 'OK'}),
    };
}