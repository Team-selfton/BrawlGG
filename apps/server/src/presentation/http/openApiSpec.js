function createOpenApiSpec({ appBaseUrl, accessTokenTtlSec }) {
  return {
    openapi: "3.0.3",
    info: {
      title: "BrawlGG API",
      version: "2.3.0",
      description: "JWT Access/Refresh 재발급 구조를 사용하는 BrawlGG API 명세입니다."
    },
    servers: [
      {
        url: appBaseUrl || "http://localhost:3000",
        description: "BrawlGG Server"
      }
    ],
    tags: [
      { name: "Health", description: "서버 상태 확인" },
      { name: "Auth", description: "Supercell OAuth + JWT 인증" },
      { name: "Player", description: "플레이어 조회" },
      { name: "Club", description: "클럽 조회" },
      { name: "Rankings", description: "리더보드/랭킹 조회" },
      { name: "Location", description: "국가/지역 조회" },
      { name: "Events", description: "이벤트/로테이션 조회" },
      { name: "Meta", description: "브롤러 목록/메타 조회" },
      { name: "Docs", description: "API 문서" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            reason: { type: "string" },
            message: { type: "string" },
            details: { type: "object", nullable: true }
          }
        },
        TokenPairResponse: {
          type: "object",
          properties: {
            tokenType: { type: "string", example: "Bearer" },
            accessToken: { type: "string", example: "eyJ..." },
            refreshToken: { type: "string", example: "eyJ..." },
            expiresIn: { type: "integer", example: accessTokenTtlSec || 900 }
          }
        },
        AuthStatusResponse: {
          type: "object",
          properties: {
            authenticated: { type: "boolean", example: true },
            oauthEnabled: { type: "boolean", example: true },
            tokenType: { type: "string", example: "Bearer" },
            user: {
              type: "object",
              nullable: true,
              properties: {
                sub: { type: "string", example: "supercell-123456" },
                name: { type: "string", nullable: true, example: "BrawlerUser" },
                email: { type: "string", nullable: true, example: "user@example.com" },
                provider: { type: "string", example: "supercell" }
              }
            }
          }
        },
        HealthResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: true },
            service: { type: "string", example: "brawlgg" },
            brawlApiTokenConfigured: { type: "boolean", example: true },
            oauthEnabled: { type: "boolean", example: true },
            requireLoginForApi: { type: "boolean", example: false }
          }
        },
        GenericItemsResponse: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true
              }
            }
          }
        }
      }
    },
    paths: {
      "/api/health": {
        get: {
          tags: ["Health"],
          summary: "서버 상태 조회",
          responses: {
            200: {
              description: "정상 응답",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" }
                }
              }
            }
          }
        }
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "현재 인증 상태 조회 (Bearer 토큰 기반)",
          responses: {
            200: {
              description: "인증 상태",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthStatusResponse" }
                }
              }
            }
          }
        }
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Refresh Token으로 Access/Refresh 재발급",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string", example: "eyJ..." }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: "재발급 성공",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TokenPairResponse" }
                }
              }
            },
            401: {
              description: "유효하지 않은 refresh token",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" }
                }
              }
            }
          }
        }
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "로그아웃 (refresh session revoke)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    refreshToken: { type: "string", example: "eyJ..." }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: "로그아웃 완료"
            }
          }
        }
      },
      "/api/auth/supercell/start": {
        get: {
          tags: ["Auth"],
          summary: "Supercell OAuth 로그인 시작",
          parameters: [
            {
              name: "return_to",
              in: "query",
              required: false,
              schema: { type: "string", example: "/" },
              description:
                "웹은 '/' 경로를 사용하고, 모바일 앱은 예: brawlgg://auth-callback 같은 커스텀 스킴을 전달할 수 있습니다."
            }
          ],
          responses: {
            302: { description: "OAuth 제공자 인증 페이지로 이동" }
          }
        }
      },
      "/api/auth/supercell/callback": {
        get: {
          tags: ["Auth"],
          summary:
            "Supercell OAuth 콜백 (웹은 localStorage 저장, 모바일 딥링크는 토큰 쿼리 전달 후 리다이렉트)",
          parameters: [
            { name: "code", in: "query", required: false, schema: { type: "string" } },
            { name: "state", in: "query", required: false, schema: { type: "string" } },
            { name: "error", in: "query", required: false, schema: { type: "string" } },
            {
              name: "error_description",
              in: "query",
              required: false,
              schema: { type: "string" }
            }
          ],
          responses: {
            200: { description: "로그인 완료 HTML 페이지" }
          }
        }
      },
      "/api/player/{tag}": {
        get: createPlayerOperation("플레이어 프로필 조회")
      },
      "/api/player/{tag}/overview": {
        get: createPlayerOperation("플레이어 오버뷰 조회")
      },
      "/api/player/{tag}/battlelog": {
        get: createPlayerOperation("플레이어 배틀로그 조회")
      },
      "/api/player/identity/overview": {
        get: {
          tags: ["Player"],
          summary: "이름 + 태그로 플레이어 오버뷰 조회 (이름 일치 여부 포함)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "name",
              in: "query",
              required: true,
              schema: { type: "string", example: "BrawlerUser" }
            },
            {
              name: "tag",
              in: "query",
              required: true,
              schema: { type: "string", example: "2PP" }
            }
          ],
          responses: {
            200: {
              description: "조회 성공",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      identityMatched: { type: "boolean", example: true },
                      identity: {
                        type: "object",
                        properties: {
                          expectedName: { type: "string", example: "BrawlerUser" },
                          actualName: { type: "string", example: "BrawlerUser" },
                          resolvedTag: { type: "string", example: "#2PP" }
                        }
                      },
                      player: { type: "object", additionalProperties: true },
                      battlelog: { type: "object", additionalProperties: true },
                      insights: { type: "object", additionalProperties: true },
                      topBrawlers: { type: "array", items: { type: "object", additionalProperties: true } }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/club/{tag}": {
        get: createClubOperation("클럽 프로필 조회")
      },
      "/api/club/{tag}/members": {
        get: createClubOperation("클럽 멤버 목록 조회")
      },
      "/api/players/multi": {
        get: {
          tags: ["Player"],
          summary: "멀티 플레이어 오버뷰 조회",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "tags",
              in: "query",
              required: true,
              schema: { type: "string", example: "2PP,8Q8,YQ9U" }
            }
          ],
          responses: {
            200: {
              description: "멀티 조회 결과",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true
                  }
                }
              }
            }
          }
        }
      },
      "/api/rankings/players": {
        get: createRankingOperation("플레이어 랭킹 조회")
      },
      "/api/rankings/clubs": {
        get: createRankingOperation("클럽 랭킹 조회")
      },
      "/api/rankings/brawlers": {
        get: {
          ...createRankingOperation("브롤러 랭킹 조회"),
          parameters: [
            ...baseRankingParameters(),
            {
              name: "brawlerId",
              in: "query",
              required: true,
              schema: { type: "integer", example: 16000000 }
            }
          ]
        }
      },
      "/api/locations": {
        get: {
          tags: ["Location"],
          summary: "국가/지역 목록 조회",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 5, maximum: 50, example: 50 }
            }
          ],
          responses: {
            200: {
              description: "지역 목록",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericItemsResponse" }
                }
              }
            }
          }
        }
      },
      "/api/locations/{locationId}": {
        get: {
          tags: ["Location"],
          summary: "특정 지역 조회",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "locationId",
              in: "path",
              required: true,
              schema: { type: "string", example: "global" }
            }
          ],
          responses: {
            200: {
              description: "지역 정보",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true
                  }
                }
              }
            }
          }
        }
      },
      "/api/events": {
        get: {
          tags: ["Events"],
          summary: "이벤트 데이터 조회",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "이벤트 데이터",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true
                  }
                }
              }
            }
          }
        }
      },
      "/api/events/rotation": {
        get: {
          tags: ["Events"],
          summary: "이벤트 로테이션 조회",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "활성/예정 이벤트",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      active: {
                        type: "array",
                        items: { type: "object", additionalProperties: true }
                      },
                      upcoming: {
                        type: "array",
                        items: { type: "object", additionalProperties: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/brawlers": {
        get: {
          tags: ["Meta"],
          summary: "브롤러 목록 조회",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "브롤러 목록",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GenericItemsResponse" }
                }
              }
            }
          }
        }
      },
      "/api/brawlers/{brawlerId}": {
        get: {
          tags: ["Meta"],
          summary: "브롤러 상세 조회",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "brawlerId",
              in: "path",
              required: true,
              schema: { type: "integer", example: 16000000 }
            }
          ],
          responses: {
            200: {
              description: "브롤러 상세",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true
                  }
                }
              }
            }
          }
        }
      },
      "/api/docs/openapi.json": {
        get: {
          tags: ["Docs"],
          summary: "OpenAPI JSON 명세 조회",
          responses: {
            200: {
              description: "OpenAPI JSON"
            }
          }
        }
      }
    }
  };
}

function createPlayerOperation(summary) {
  return {
    tags: ["Player"],
    summary,
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: "tag",
        in: "path",
        required: true,
        schema: { type: "string", example: "2PP" }
      }
    ],
    responses: {
      200: {
        description: "조회 성공",
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: true
            }
          }
        }
      },
      401: {
        description: "인증 필요"
      }
    }
  };
}

function createClubOperation(summary) {
  return {
    tags: ["Club"],
    summary,
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: "tag",
        in: "path",
        required: true,
        schema: { type: "string", example: "YQ0L8C" }
      }
    ],
    responses: {
      200: {
        description: "조회 성공",
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: true
            }
          }
        }
      }
    }
  };
}

function createRankingOperation(summary) {
  return {
    tags: ["Rankings"],
    summary,
    security: [{ bearerAuth: [] }],
    parameters: baseRankingParameters(),
    responses: {
      200: {
        description: "랭킹 조회 결과",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/GenericItemsResponse" }
          }
        }
      }
    }
  };
}

function baseRankingParameters() {
  return [
    {
      name: "country",
      in: "query",
      required: false,
      schema: { type: "string", example: "global" }
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 5, maximum: 50, example: 20 }
    }
  ];
}

module.exports = { createOpenApiSpec };
