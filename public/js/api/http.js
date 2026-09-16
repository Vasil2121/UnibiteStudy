export async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error);
        error.status = response.status;
        error.fields = data.fields;
        throw error;
    }

    return data;
}
