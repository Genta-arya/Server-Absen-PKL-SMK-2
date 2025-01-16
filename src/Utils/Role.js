const validRoles = ["pembimbing", "user","admin"];

export const isValidRole = (role) => {
    return validRoles.includes(role);
};