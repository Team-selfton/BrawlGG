function createOpenApiSpec({ appBaseUrl, cookieName }) {
  const authCookieName = cookieName || "brawlgg_session";

  return {
    openapi: "3.0.3",
    info: {
      title: "BrawlGG API",
      version: "1.0.0",
      description:
        "Brawl Stars 전적, 멀티검색, 랭킹, OAuth 인증을 제공하는 BrawlGG API 명세입니다."
    },
    servers: [
      {
        url: appBaseUrl || "http://localhost:3000",
        description: "BrawlGG Server"
      }
    ],
    tags: [
      { name: "Health", description: "서버 상태 확인" },
      { name: "Auth", description: "Supercell OAuth 인증" },
      { name: "Player", description: "플레이어 조회" },
      { name: "Rankings", description: "리더보드/랭킹 조회" },
      { name: "Meta", description: "브롤러 목록/메타 조회" },
      { name: "Docs", description: "API 문서" }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: authCookieName
        }
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            reason: { type: "string", example: "INVALID_TAG" },
            message: { type: "string", example: "Player tag is missing or invalid." },
            details: { type: "object", nullable: true }
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
        AuthStatusResponse: {
          type: "object",
          properties: {
            authenticated: { type: "boolean", example: true },
            oauthEnabled: { type: "boolean", example: true },
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
        BattlelogItem: {
          type: "object",
          additionalProperties: true
        },
        BattlelogResponse: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/BattlelogItem" }
            }
          }
        },
        PlayerOverviewResponse: {
          type: "object",
          properties: {
            player: { type: "object", additionalProperties: true },
            battlelog: { $ref: "#/components/schemas/BattlelogResponse" },
            insights: {
              type: "object",
              properties: {
                sampleSize: { type: "integer", example: 10 },
                wins: { type: "integer", example: 6 },
                losses: { type: "integer", example: 4 },
                draws: { type: "integer", example: 0 },
                winRate: { type: "integer", example: 60 },
                trophyDelta: { type: "integer", example: 32 },
                mostPlayedMode: { type: "string", example: "BRAWL_BALL" }
              }
            },
            topBrawlers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 16000000 },
                  name: { type: "string", example: "SHELLY" },
                  trophies: { type: "integer", example: 900 },
                  highestTrophies: { type: "integer", example: 1020 },
                  power: { type: "integer", example: 11 },
                  rank: { type: "integer", example: 30 }
                }
              }
            }
          }
        },
        MultiPlayerOverviewResponse: {
          type: "object",
          properties: {
            tags: { type: "array", items: { type: "string", example: "#2PP" } },
            successCount: { type: "integer", example: 2 },
            failedCount: { type: "integer", example: 1 },
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true
              }
            }
          }
        },
        RankingResponse: {
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
        },
        BrawlersResponse: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 16000000 },
                  name: { type: "string", example: "SHELLY" },
                  starPowers: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: true
                    }
                  }
                }
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
          summary: "현재 인증 상태 조회",
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
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "로그아웃",
          responses: {
            200: {
              description: "로그아웃 완료",
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
        },
        get: {
          tags: ["Auth"],
          summary: "GET 방식 로그아웃",
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
              description: "인증 완료 후 리디렉트할 경로"
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
          summary: "Supercell OAuth 콜백",
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
            302: { description: "인증 완료 후 서비스 페이지로 이동" },
            400: {
              description: "잘못된 콜백 파라미터",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" }
                }
              }
            }
          }
        }
      },
      "/api/player/{tag}": {
        get: {
          tags: ["Player"],
          summary: "플레이어 프로필 조회",
          security: [{ cookieAuth: [] }],
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
              description: "플레이어 프로필",
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
              description: "인증 필요",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" }
                }
              }
            }
          }
        }
      },
      "/api/player/{tag}/overview": {
        get: {
          tags: ["Player"],
          summary: "플레이어 오버뷰 조회 (프로필 + 배틀로그 + 인사이트)",
          security: [{ cookieAuth: [] }],
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
              description: "오버뷰 응답",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PlayerOverviewResponse" }
                }
              }
            },
            401: {
              description: "인증 필요",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" }
                }
              }
            }
          }
        }
      },
      "/api/player/{tag}/battlelog": {
        get: {
          tags: ["Player"],
          summary: "플레이어 배틀로그 조회",
          security: [{ cookieAuth: [] }],
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
              description: "배틀로그 응답",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BattlelogResponse" }
                }
              }
            }
          }
        }
      },
      "/api/players/multi": {
        get: {
          tags: ["Player"],
          summary: "멀티 플레이어 오버뷰 조회",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "tags",
              in: "query",
              required: true,
              schema: { type: "string", example: "2PP,8Q8,YQ9U" },
              description: "콤마 또는 공백으로 구분된 플레이어 태그 목록"
            }
          ],
          responses: {
            200: {
              description: "멀티 조회 결과",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/MultiPlayerOverviewResponse" }
                }
              }
            }
          }
        }
      },
      "/api/rankings/players": {
        get: createRankingGetOperation("플레이어 랭킹 조회")
      },
      "/api/rankings/clubs": {
        get: createRankingGetOperation("클럽 랭킹 조회")
      },
      "/api/rankings/brawlers": {
        get: {
          tags: ["Rankings"],
          summary: "브롤러 랭킹 조회",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "country",
              in: "query",
              required: false,
              schema: { type: "string", example: "global" },
              description: "국가 코드 또는 global"
            },
            {
              name: "brawlerId",
              in: "query",
              required: true,
              schema: { type: "integer", example: 16000000 },
              description: "브롤러 ID"
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 5, maximum: 50, example: 20 }
            }
          ],
          responses: {
            200: {
              description: "랭킹 조회 결과",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RankingResponse" }
                }
              }
            },
            400: {
              description: "잘못된 brawlerId",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" }
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
          security: [{ cookieAuth: [] }],
          responses: {
            200: {
              description: "브롤러 목록",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BrawlersResponse" }
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
              description: "OpenAPI JSON",
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
      }
    }
  };
}

function createRankingGetOperation(summary) {
  return {
    tags: ["Rankings"],
    summary,
    security: [{ cookieAuth: [] }],
    parameters: [
      {
        name: "country",
        in: "query",
        required: false,
        schema: { type: "string", example: "global" },
        description: "국가 코드 또는 global"
      },
      {
        name: "limit",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 5, maximum: 50, example: 20 }
      }
    ],
    responses: {
      200: {
        description: "랭킹 조회 결과",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RankingResponse" }
          }
        }
      }
    }
  };
}

module.exports = { createOpenApiSpec };
