const axios = require("axios");

const BASE_URL = "http://localhost:3000/api/v1";

const createRandomUsername = (prefix = "user") => `${prefix}_${Math.random().toString(36).substring(2, 15)}`;
const defaultPassword = "password@123";

const signupUser = async (username, password, role) =>
  axios.post(`${BASE_URL}/auth/signup`, { username, password, role });

const loginUser = async (username, password) =>
  axios.post(`${BASE_URL}/auth/signin`, { username, password });

const createAvatar = async (token, imageUrl, name) =>
  axios.post(
    `${BASE_URL}/avatar`,
    { imageUrl, name },
    { headers: { Authorization: `Bearer ${token}` } }
  );

describe("Authentication API", () => {
  test("User receives userId after successful signup", async () => {
    const username = createRandomUsername("user");
    const response = await signupUser(username, defaultPassword, "user");
    expect(response.data.userId).toBeDefined();
  });

  test("User can sign up only once", async () => {
    const username = createRandomUsername("user");
    const response = await signupUser(username, defaultPassword, "user");
    expect(response.status).toBe(200);

    const secondResponse = await signupUser(username, defaultPassword, "user");
    expect(secondResponse.status).not.toBe(200);
  });

  test("Admin can sign up only once", async () => {
    const username = createRandomUsername("admin");
    const response = await signupUser(username, defaultPassword, "admin");
    expect(response.status).toBe(200);

    const secondResponse = await signupUser(username, defaultPassword, "admin");
    expect(secondResponse.status).toBe(400);
  });

  test("Signup fails if username is missing (user)", async () => {
    const response = await signupUser(undefined, defaultPassword, "user");
    expect(response.status).not.toBe(200);
  });

  test("Signup fails if username is missing (admin)", async () => {
    const response = await signupUser(undefined, defaultPassword, "admin");
    expect(response.status).not.toBe(200);
  });

  test("User can login with correct credentials", async () => {
    const username = createRandomUsername("user");
    await signupUser(username, defaultPassword, "user");

    const response = await loginUser(username, defaultPassword);
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
  });

  test("User cannot login with incorrect credentials", async () => {
    const username = createRandomUsername("user");
    await signupUser(username, defaultPassword, "user");

    const response = await loginUser(username, `${defaultPassword}1`);
    expect(response.status).toBe(403);
  });
});

describe("User Metadata API", () => {
  let adminToken, userToken, avatarId;

  beforeAll(async () => {
    // Setup admin account and token
    const adminUsername = createRandomUsername("admin");
    await signupUser(adminUsername, defaultPassword, "admin");
    const adminLogin = await loginUser(adminUsername, defaultPassword);
    adminToken = adminLogin.data.token;

    // Setup user account and token
    const userUsername = createRandomUsername("user");
    await signupUser(userUsername, defaultPassword, "user");
    const userLogin = await loginUser(userUsername, defaultPassword);
    userToken = userLogin.data.token;

    // Create an avatar
    const avatarResponse = await createAvatar(
      adminToken,
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
      `Avatar_${Math.random().toString(36).substring(2, 10)}`
    );
    avatarId = avatarResponse.data.avatarId;
  });

  test("Admin can create an avatar", async () => {
    const response = await createAvatar(
      adminToken,
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
      `Avatar_${Math.random().toString(36).substring(2, 10)}`
    );
    expect(response.status).toBe(200);
    expect(response.data.avatarId).toBeDefined();
  });

  test("User cannot create an avatar", async () => {
    const response = await createAvatar(
      userToken,
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
      `Avatar_${Math.random().toString(36).substring(2, 10)}`
    );
    expect(response.status).toBe(403);
  });

  test("User cannot update metadata with invalid avatarId", async () => {
    const response = await axios.post(
      `${BASE_URL}/user/metadata`,
      { avatarId: "invalid-avatar-id" },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(response.status).toBe(400);
  });

  test("User cannot update metadata without auth header", async () => {
    const response = await axios.post(`${BASE_URL}/user/metadata`, {
      avatarId,
    });
    expect(response.status).toBe(403);
  });

  test("User can update metadata with valid avatarId", async () => {
    const response = await axios.post(
      `${BASE_URL}/user/metadata`,
      { avatarId },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(response.status).toBe(200);
  });
});


describe("User avatar information", () => {
  let avatarId;
  let token;
  let userId;

  beforeAll(async () => {
    const username = createRandomUsername("user-srai");
    await signupUser(username, defaultPassword, "admin");
    const loginResponse = await loginUser(username, defaultPassword);
    token = loginResponse.data.token;
    userId = loginResponse.data.userId;

    const avatarResponse = await createAvatar(
      token,
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
      "Timmy"
    );

    avatarId = avatarResponse.data.avatarId;
  });

  test("Get back avatar information for a user", async () => {
    const response = await axios.get(
      `${BASE_URL}/user/metadata/bulk?ids=[${userId}]`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(response.data.avatars.length).toBe(1);
    expect(response.data.avatars[0].userId).toBe(userId);
  });

  test("Available avatars lists the recently created avatar", async () => {
    const response = await axios.get(`${BASE_URL}/avatars`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.data.avatars.length).not.toBe(0);
    const currentAvatar = response.data.avatars.find((x) => x.id == avatarId);
    expect(currentAvatar).toBeDefined();
  });
});

describe("Space information", () => {
  let mapId;
  let element1Id;
  let element2Id;
  let adminToken;
  let adminId;
  let userToken;
  let userId;

  const createElement = async (token, imageUrl, width, height, isStatic) =>
    axios.post(
      `${BASE_URL}/admin/element`,
      { imageUrl, width, height, static: isStatic },
      { headers: { Authorization: `Bearer ${token}` } }
    );

  const createMap = async (token, thumbnail, dimensions, name, defaultElements) =>
    axios.post(
      `${BASE_URL}/admin/map`,
      { thumbnail, dimensions, name, defaultElements },
      { headers: { Authorization: `Bearer ${token}` } }
    );

  beforeAll(async () => {
    const adminUsername = createRandomUsername("srai-admin");
    await signupUser(adminUsername, defaultPassword, "admin");
    const adminLogin = await loginUser(adminUsername, defaultPassword);
    adminToken = adminLogin.data.token;
    adminId = adminLogin.data.userId;

    const userUsername = createRandomUsername("srai-user");
    await signupUser(userUsername, defaultPassword, "user");
    const userLogin = await loginUser(userUsername, defaultPassword);
    userToken = userLogin.data.token;
    userId = userLogin.data.userId;

    const element1Response = await createElement(
      adminToken,
      "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
      1,
      1,
      true
    );

    const element2Response = await createElement(
      adminToken,
      "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
      1,
      1,
      true
    );

    element1Id = element1Response.data.id;
    element2Id = element2Response.data.id;

    const mapResponse = await createMap(
      adminToken,
      "https://thumbnail.com/a.png",
      "100x200",
      "Test space",
      [
        { elementId: element1Id, x: 20, y: 20 },
        { elementId: element1Id, x: 18, y: 20 },
        { elementId: element2Id, x: 19, y: 20 },
      ]
    );

    mapId = mapResponse.data.id;
  });

  test("User is able to create a space", async () => {
    const response = await axios.post(
      `${BASE_URL}/space`,
      { name: "Test", dimensions: "100x200", mapId },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(response.status).toBe(200);
    expect(response.data.spaceId).toBeDefined();
  });

  test("User is able to create a space without mapId (empty space)", async () => {
    const response = await axios.post(
      `${BASE_URL}/space`,
      { name: "Test", dimensions: "100x200" },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(response.data.spaceId).toBeDefined();
  });

  test("User is not able to create a space without mapId and dimensions", async () => {
    const response = await axios.post(
      `${BASE_URL}/space`,
      { name: "Test" },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(response.status).toBe(400);
  });

  test("User is not able to delete a space that doesn’t exist", async () => {
    const response = await axios.delete(`${BASE_URL}/space/randomIdDoesntExist`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(response.status).toBe(400);
  });

  test("User is able to delete a space that does exist", async () => {
    const spaceResponse = await axios.post(
      `${BASE_URL}/space`,
      { name: "Test", dimensions: "100x200" },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    const deleteResponse = await axios.delete(
      `${BASE_URL}/space/${spaceResponse.data.spaceId}`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    expect(deleteResponse.status).toBe(200);
  });

  test("User should not be able to delete a space created by another user", async () => {
    const spaceResponse = await axios.post(
      `${BASE_URL}/space`,
      { name: "Test", dimensions: "100x200" },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    const deleteResponse = await axios.delete(
      `${BASE_URL}/space/${spaceResponse.data.spaceId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(deleteResponse.status).toBe(403);
  });

  test("Admin initially has no spaces", async () => {
    const response = await axios.get(`${BASE_URL}/space/all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(response.data.spaces.length).toBe(0);
  });

  test("Admin gets one space after creation", async () => {
    const spaceCreateResponse = await axios.post(
      `${BASE_URL}/space`,
      { name: "Test", dimensions: "100x200" },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const response = await axios.get(`${BASE_URL}/space/all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const filteredSpace = response.data.spaces.find(
      (x) => x.id == spaceCreateResponse.data.spaceId
    );
    expect(response.data.spaces.length).toBe(1);
    expect(filteredSpace).toBeDefined();
  });
});


describe("Arena endpoints", () => {
  let mapId;
  let element1Id;
  let element2Id;
  let adminToken;
  let adminId;
  let userToken;
  let userId;
  let spaceId;

  beforeAll(async () => {
      const username = `srai-${Math.random()}`
      const password = "123456"

      const signupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
       username,
       password,
       type: "admin"
      });

      adminId = signupResponse.data.userId

      const response = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
       username: username,
       password
      })

      adminToken = response.data.token

      const userSignupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
          username: username + "-user",
          password,
          type: "user"
      });
 
      userId = userSignupResponse.data.userId
  
      const userSigninResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
          username: username  + "-user",
          password
      })
  
      userToken = userSigninResponse.data.token

      const element1Response = await axios.post(`${BACKEND_URL}/api/v1/admin/element`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
          "width": 1,
          "height": 1,
        "static": true
      }, {
          headers: {
              authorization: `Bearer ${adminToken}`
          }
      });

      const element2Response = await axios.post(`${BACKEND_URL}/api/v1/admin/element`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
          "width": 1,
          "height": 1,
        "static": true
      }, {
          headers: {
              authorization: `Bearer ${adminToken}`
          }
      })
      element1Id = element1Response.data.id
      element2Id = element2Response.data.id

      const mapResponse = await axios.post(`${BACKEND_URL}/api/v1/admin/map`, {
          "thumbnail": "https://thumbnail.com/a.png",
          "dimensions": "100x200",
          name: "Default space",
          "defaultElements": [{
                  elementId: element1Id,
                  x: 20,
                  y: 20
              }, {
                elementId: element1Id,
                  x: 18,
                  y: 20
              }, {
                elementId: element2Id,
                  x: 19,
                  y: 20
              }
          ]
       }, {
          headers: {
              authorization: `Bearer ${adminToken}`
          }
       })
       mapId = mapResponse.data.id

      const spaceResponse = await axios.post(`${BACKEND_URL}/api/v1/space`, {
          "name": "Test",
          "dimensions": "100x200",
          "mapId": mapId
      }, {headers: {
          "authorization": `Bearer ${userToken}`
      }})
      console.log(spaceResponse.data)
      spaceId = spaceResponse.data.spaceId
  });

  test("Incorrect spaceId returns a 400", async () => {
      const response = await axios.get(`${BACKEND_URL}/api/v1/space/123kasdk01`, {
          headers: {
              "authorization": `Bearer ${userToken}`
          }
      });
      expect(response.status).toBe(400)
  })

  test("Correct spaceId returns all the elements", async () => {
      const response = await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`, {
          headers: {
              "authorization": `Bearer ${userToken}`
          }
      });
      console.log(response.data)
      expect(response.data.dimensions).toBe("100x200")
      expect(response.data.elements.length).toBe(3)
  })

  test("Delete endpoint is able to delete an element", async () => {
      const response = await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`, {
          headers: {
              "authorization": `Bearer ${userToken}`
          }
      });

      console.log(response.data.elements[0].id )
      let res = await axios.delete(`${BACKEND_URL}/api/v1/space/element`, {
          data: {id: response.data.elements[0].id},
          headers: {
              "authorization": `Bearer ${userToken}`
          }
      });


      const newResponse = await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`, {
          headers: {
              "authorization": `Bearer ${userToken}`
          }
      });

      expect(newResponse.data.elements.length).toBe(2)
  })

  test("Adding an element fails if the element lies outside the dimensions", async () => {
     const newResponse = await axios.post(`${BACKEND_URL}/api/v1/space/element`, {
          "elementId": element1Id,
          "spaceId": spaceId,
          "x": 10000,
          "y": 210000
      }, {
          headers: {
              "authorization": `Bearer ${userToken}`
          }
      });

      expect(newResponse.status).toBe(400)
  })

  test("Adding an element works as expected", async () => {
      await axios.post(`${BACKEND_URL}/api/v1/space/element`, {
          "elementId": element1Id,
          "spaceId": spaceId,
          "x": 50,
          "y": 20
      }, {
          headers: {
              "authorization": `Bearer ${userToken}`
          }
      });

      const newResponse = await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`, {
          headers: {
              "authorization": `Bearer ${userToken}`
          }
      });

      expect(newResponse.data.elements.length).toBe(3)
  })

})

describe("Admin Endpoints", () => {
  let adminToken;
  let adminId;
  let userToken;
  let userId;

  beforeAll(async () => {
      const username = `srai-${Math.random()}`
      const password = "123456"

      const signupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
       username,
       password,
       type: "admin"
      });

      adminId = signupResponse.data.userId

      const response = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
       username: username,
       password
      })

      adminToken = response.data.token

      const userSignupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
          username: username + "-user",
          password,
          type: "user"
      });
 
      userId = userSignupResponse.data.userId
  
      const userSigninResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
          username: username  + "-user",
          password
      })
  
      userToken = userSigninResponse.data.token
  });

  test("User is not able to hit admin Endpoints", async () => {
      const elementReponse = await axios.post(`${BACKEND_URL}/api/v1/admin/element`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
          "width": 1,
          "height": 1,
        "static": true
      }, {
          headers: {
              authorization: `Bearer ${userToken}`
          }
      });

      const mapResponse = await axios.post(`${BACKEND_URL}/api/v1/admin/map`, {
          "thumbnail": "https://thumbnail.com/a.png",
          "dimensions": "100x200",
          "name": "test space",
          "defaultElements": []
       }, {
          headers: {
              authorization: `Bearer ${userToken}`
          }
      })

      const avatarResponse = await axios.post(`${BACKEND_URL}/api/v1/admin/avatar`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
          "name": "Timmy"
      }, {
          headers: {
              "authorization": `Bearer ${userToken}`
          }
      })

      const updateElementResponse = await axios.put(`${BACKEND_URL}/api/v1/admin/element/123`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
      }, {
          headers: {
              "authorization": `Bearer ${userToken}`
          }
      })

      expect(elementReponse.status).toBe(403)
      expect(mapResponse.status).toBe(403)
      expect(avatarResponse.status).toBe(403)
      expect(updateElementResponse.status).toBe(403)
  })

  test("Admin is able to hit admin Endpoints", async () => {
      const elementReponse = await axios.post(`${BACKEND_URL}/api/v1/admin/element`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
          "width": 1,
          "height": 1,
        "static": true
      }, {
          headers: {
              authorization: `Bearer ${adminToken}`
          }
      });

      const mapResponse = await axios.post(`${BACKEND_URL}/api/v1/admin/map`, {
          "thumbnail": "https://thumbnail.com/a.png",
          "name": "Space",
          "dimensions": "100x200",
          "defaultElements": []
       }, {
          headers: {
              authorization: `Bearer ${adminToken}`
          }
      })

      const avatarResponse = await axios.post(`${BACKEND_URL}/api/v1/admin/avatar`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
          "name": "Timmy"
      }, {
          headers: {
              "authorization": `Bearer ${adminToken}`
          }
      })
      expect(elementReponse.status).toBe(200)
      expect(mapResponse.status).toBe(200)
      expect(avatarResponse.status).toBe(200)
  })

  test("Admin is able to update the imageUrl for an element", async () => {
      const elementResponse = await axios.post(`${BACKEND_URL}/api/v1/admin/element`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
          "width": 1,
          "height": 1,
        "static": true
      }, {
          headers: {
              authorization: `Bearer ${adminToken}`
          }
      });

      const updateElementResponse = await axios.put(`${BACKEND_URL}/api/v1/admin/element/${elementResponse.data.id}`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
      }, {
          headers: {
              "authorization": `Bearer ${adminToken}`
          }
      })

      expect(updateElementResponse.status).toBe(200);

  })
});


describe("Websocket tests", () => {
  let adminToken;
  let adminUserId;
  let userToken;
  let adminId;
  let userId;
  let mapId;
  let element1Id;
  let element2Id;
  let spaceId;
  let ws1; 
  let ws2;
  let ws1Messages = []
  let ws2Messages = []
  let userX;
  let userY;
  let adminX;
  let adminY;

  function waitForAndPopLatestMessage(messageArray) {
      return new Promise(resolve => {
          if (messageArray.length > 0) {
              resolve(messageArray.shift())
          } else {
              let interval = setInterval(() => {
                  if (messageArray.length > 0) {
                      resolve(messageArray.shift())
                      clearInterval(interval)
                  }
              }, 100)
          }
      })
  }

  async function setupHTTP() {
      const username = `srai-${Math.random()}`
      const password = "123456"
      const adminSignupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
          username,
          password,
          type: "admin"
      })

      const adminSigninResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
          username,
          password
      })

      adminUserId = adminSignupResponse.data.userId;
      adminToken = adminSigninResponse.data.token;
      console.log("adminSignupResponse.status")
      console.log(adminSignupResponse.status)
      
      const userSignupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
          username: username + `-user`,
          password,
          type: "user"
      })
      const userSigninResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
          username: username + `-user`,
          password
      })
      userId = userSignupResponse.data.userId
      userToken = userSigninResponse.data.token
      console.log("useroktne", userToken)
      const element1Response = await axios.post(`${BACKEND_URL}/api/v1/admin/element`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
          "width": 1,
          "height": 1,
        "static": true
      }, {
          headers: {
              authorization: `Bearer ${adminToken}`
          }
      });

      const element2Response = await axios.post(`${BACKEND_URL}/api/v1/admin/element`, {
          "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
          "width": 1,
          "height": 1,
        "static": true
      }, {
          headers: {
              authorization: `Bearer ${adminToken}`
          }
      })
      element1Id = element1Response.data.id
      element2Id = element2Response.data.id

      const mapResponse = await axios.post(`${BACKEND_URL}/api/v1/admin/map`, {
          "thumbnail": "https://thumbnail.com/a.png",
          "dimensions": "100x200",
          "name": "Defaul space",
          "defaultElements": [{
                  elementId: element1Id,
                  x: 20,
                  y: 20
              }, {
                elementId: element1Id,
                  x: 18,
                  y: 20
              }, {
                elementId: element2Id,
                  x: 19,
                  y: 20
              }
          ]
       }, {
          headers: {
              authorization: `Bearer ${adminToken}`
          }
       })
       mapId = mapResponse.data.id

      const spaceResponse = await axios.post(`${BACKEND_URL}/api/v1/space`, {
          "name": "Test",
          "dimensions": "100x200",
          "mapId": mapId
      }, {headers: {
          "authorization": `Bearer ${userToken}`
      }})

      console.log(spaceResponse.status)
      spaceId = spaceResponse.data.spaceId
  }
  async function setupWs() {
      ws1 = new WebSocket(WS_URL)

      ws1.onmessage = (event) => {
          console.log("got back adata 1")
          console.log(event.data)
          
          ws1Messages.push(JSON.parse(event.data))
      }
      await new Promise(r => {
        ws1.onopen = r
      })

      ws2 = new WebSocket(WS_URL)

      ws2.onmessage = (event) => {
          console.log("got back data 2")
          console.log(event.data)
          ws2Messages.push(JSON.parse(event.data))
      }
      await new Promise(r => {
          ws2.onopen = r  
      })
  }
  
  beforeAll(async () => {
      await setupHTTP()
      await setupWs()
  })

  test("Get back ack for joining the space", async () => {
      console.log("insixce first test")
      ws1.send(JSON.stringify({
          "type": "join",
          "payload": {
              "spaceId": spaceId,
              "token": adminToken
          }
      }))
      console.log("insixce first test1")
      const message1 = await waitForAndPopLatestMessage(ws1Messages);
      console.log("insixce first test2")
      ws2.send(JSON.stringify({
          "type": "join",
          "payload": {
              "spaceId": spaceId,
              "token": userToken
          }
      }))
      console.log("insixce first test3")

      const message2 = await waitForAndPopLatestMessage(ws2Messages);
      const message3 = await waitForAndPopLatestMessage(ws1Messages);

      expect(message1.type).toBe("space-joined")
      expect(message2.type).toBe("space-joined")
      expect(message1.payload.users.length).toBe(0)
      expect(message2.payload.users.length).toBe(1)
      expect(message3.type).toBe("user-joined");
      expect(message3.payload.x).toBe(message2.payload.spawn.x);
      expect(message3.payload.y).toBe(message2.payload.spawn.y);
      expect(message3.payload.userId).toBe(userId);

      adminX = message1.payload.spawn.x
      adminY = message1.payload.spawn.y

      userX = message2.payload.spawn.x
      userY = message2.payload.spawn.y
  })

  test("User should not be able to move across the boundary of the wall", async () => {
      ws1.send(JSON.stringify({
          type: "move",
          payload: {
              x: 1000000,
              y: 10000
          }
      }));

      const message = await waitForAndPopLatestMessage(ws1Messages);
      expect(message.type).toBe("movement-rejected")
      expect(message.payload.x).toBe(adminX)
      expect(message.payload.y).toBe(adminY)
  })

  test("User should not be able to move two blocks at the same time", async () => {
      ws1.send(JSON.stringify({
          type: "move",
          payload: {
              x: adminX + 2,
              y: adminY
          }
      }));

      const message = await waitForAndPopLatestMessage(ws1Messages);
      expect(message.type).toBe("movement-rejected")
      expect(message.payload.x).toBe(adminX)
      expect(message.payload.y).toBe(adminY)
  })

  test("Correct movement should be broadcasted to the other sockets in the room",async () => {
      ws1.send(JSON.stringify({
          type: "move",
          payload: {
              x: adminX + 1,
              y: adminY,
              userId: adminId
          }
      }));

      const message = await waitForAndPopLatestMessage(ws2Messages);
      expect(message.type).toBe("movement")
      expect(message.payload.x).toBe(adminX + 1)
      expect(message.payload.y).toBe(adminY)
  })

  test("If a user leaves, the other user receives a leave event", async () => {
      ws1.close()
      const message = await waitForAndPopLatestMessage(ws2Messages);
      expect(message.type).toBe("user-left")
      expect(message.payload.userId).toBe(adminUserId)
  })
})