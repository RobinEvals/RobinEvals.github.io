/**
 * 恐龙核心数据文件
 * 每条恐龙定义:
 * - standard: 标准生长曲线 (0% → 100%)
 * - primeElder: Prime Elder 曲线 (75% → 87.5% → 100%)
 * - frailElder: Frail Elder 曲线 (75% → 87.5% → 100%)
 * 
 * 生长时间点说明:
 * 0.0 = 0% (孵化)
 * 0.25 = 25% (幼年)
 * 0.375 = 37.5% (少年)
 * 0.5 = 50% (亚成年)
 * 0.625 = 62.5% (青年)
 * 0.75 = 75% (成年)
 * 0.875 = 87.5% (Prime Elder 壮年)
 * 1.0 = 100% (Frail Elder 老年)
 */

const DinosaursData = {
    // ==================== 南方盗龙 ====================
    Austroraptor: {
        displayName: "Austroraptor",
        chineseName: "南方盗龙",
        color: "#007aff",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 1 },
                { time: 0.25, value: 12 },
                { time: 0.5, value: 120 },
                { time: 0.75, value: 200 },
                { time: 1.0, value: 200 }
            ],
            primeElder: [
                { time: 0.75, value: 200 },
                { time: 0.875, value: 300 },
                { time: 1.0, value: 280 }
            ],
            frailElder: [
                { time: 0.75, value: 200 },
                { time: 0.875, value: 220 },
                { time: 1.0, value: 180 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 53 },
                    { time: 0.75, value: 58 },
                    { time: 1.0, value: 58 }
                ],
                primeElder: [
                    { time: 0.75, value: 58 },
                    { time: 0.875, value: 58 },
                    { time: 1.0, value: 56 }
                ],
                frailElder: [
                    { time: 0.75, value: 58 },
                    { time: 0.875, value: 56 },
                    { time: 1.0, value: 52 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 77 },
                    { time: 0.75, value: 240 },
                    { time: 1.0, value: 240 }
                ],
                primeElder: [
                    { time: 0.75, value: 240 },
                    { time: 0.875, value: 240 },
                    { time: 1.0, value: 230 }
                ],
                frailElder: [
                    { time: 0.75, value: 240 },
                    { time: 0.875, value: 220 },
                    { time: 1.0, value: 200 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 382 },
                    { time: 0.75, value: 1337 },
                    { time: 1.0, value: 1150 }
                ],
                primeElder: [
                    { time: 0.75, value: 1337 },
                    { time: 0.875, value: 1552 },
                    { time: 1.0, value: 1400 }
                ],
                frailElder: [
                    { time: 0.75, value: 1337 },
                    { time: 0.875, value: 1200 },
                    { time: 1.0, value: 1050 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 53 },
                    { time: 0.25, value: 126 },
                    { time: 0.375, value: 150 },
                    { time: 0.5, value: 165 },
                    { time: 0.625, value: 175 },
                    { time: 0.75, value: 180 },
                    { time: 1.0, value: 180 }
                ],
                primeElder: [
                    { time: 0.75, value: 180 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 190 }
                ],
                frailElder: [
                    { time: 0.75, value: 180 },
                    { time: 0.875, value: 185 },
                    { time: 1.0, value: 170 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.5, value: 0.5 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.85 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 0.7 },
                { time: 1.0, value: 0.55 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 40, unit: "damage" },
            AltBite: { baseValue: 100, unit: "damage" },
            "Ambush.Pin": { baseValue: 35, unit: "damage" }
        }
    },
    
    // ==================== 食肉牛龙 ====================
    Carnotaurus: {
        displayName: "Carnotaurus",
        chineseName: "食肉牛龙",
        color: "#ff9500",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 3.76 },
                { time: 0.25, value: 32 },
                { time: 0.375, value: 345 },
                { time: 0.5, value: 700 },
                { time: 0.625, value: 1000 },
                { time: 0.75, value: 1300 },
                { time: 1.0, value: 1300 }
            ],
            primeElder: [
                { time: 0.75, value: 1300 },
                { time: 0.875, value: 1800 },
                { time: 1.0, value: 1600 }
            ],
            frailElder: [
                { time: 0.75, value: 1300 },
                { time: 0.875, value: 1400 },
                { time: 1.0, value: 1200 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 53 },
                    { time: 0.25, value: 126 },
                    { time: 0.375, value: 140 },
                    { time: 0.5, value: 150 },
                    { time: 0.625, value: 157 },
                    { time: 0.75, value: 160 },
                    { time: 1.0, value: 160 }
                ],
                primeElder: [
                    { time: 0.75, value: 160 },
                    { time: 0.875, value: 170 },
                    { time: 1.0, value: 165 }
                ],
                frailElder: [
                    { time: 0.75, value: 160 },
                    { time: 0.875, value: 165 },
                    { time: 1.0, value: 155 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 77 },
                    { time: 0.25, value: 180 },
                    { time: 0.375, value: 350 },
                    { time: 0.5, value: 400 },
                    { time: 0.625, value: 425 },
                    { time: 0.75, value: 440 },
                    { time: 1.0, value: 440 }
                ],
                primeElder: [
                    { time: 0.75, value: 440 },
                    { time: 0.875, value: 500 },
                    { time: 1.0, value: 480 }
                ],
                frailElder: [
                    { time: 0.75, value: 440 },
                    { time: 0.875, value: 470 },
                    { time: 1.0, value: 440 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 382 },
                    { time: 0.25, value: 900 },
                    { time: 0.375, value: 1150 },
                    { time: 0.5, value: 1300 },
                    { time: 0.625, value: 1360 },
                    { time: 0.75, value: 1375 },
                    { time: 1.0, value: 1100 }
                ],
                primeElder: [
                    { time: 0.75, value: 1375 },
                    { time: 0.875, value: 1544 },
                    { time: 1.0, value: 1400 }
                ],
                frailElder: [
                    { time: 0.75, value: 1375 },
                    { time: 0.875, value: 1250 },
                    { time: 1.0, value: 1050 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 53 },
                    { time: 0.25, value: 126 },
                    { time: 0.375, value: 150 },
                    { time: 0.5, value: 165 },
                    { time: 0.625, value: 175 },
                    { time: 0.75, value: 180 },
                    { time: 1.0, value: 180 }
                ],
                primeElder: [
                    { time: 0.75, value: 180 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 195 }
                ],
                frailElder: [
                    { time: 0.75, value: 180 },
                    { time: 0.875, value: 190 },
                    { time: 1.0, value: 175 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.85 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 0.7 },
                { time: 1.0, value: 0.55 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 150, unit: "damage" },
            AltBite: { baseValue: 175, unit: "damage" },
            Knockdown: { baseValue: 175, unit: "damage" },
            Stagger: { baseValue: 125, unit: "damage" },
            SelfStagger: { baseValue: 100, unit: "damage" }
        }
    },
    
    // ==================== 恐鳄 ====================
    Deinosuchus: {
        displayName: "Deinosuchus",
        chineseName: "恐鳄",
        color: "#5856d6",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.5 },
                { time: 0.25, value: 12 },
                { time: 0.375, value: 130 },
                { time: 0.4, value: 195 },
                { time: 0.5, value: 550 },
                { time: 0.625, value: 2280 },
                { time: 0.7, value: 5200 },
                { time: 0.75, value: 8000 },
                { time: 1.0, value: 8000 }
            ],
            primeElder: [
                { time: 0.75, value: 8000 },
                { time: 0.875, value: 11000 },
                { time: 1.0, value: 10500 }
            ],
            frailElder: [
                { time: 0.75, value: 8000 },
                { time: 0.875, value: 9000 },
                { time: 1.0, value: 8500 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 21 },
                    { time: 0.25, value: 32.5 },
                    { time: 0.375, value: 45 },
                    { time: 0.5, value: 57.5 },
                    { time: 0.625, value: 100 },
                    { time: 0.75, value: 144 },
                    { time: 1.0, value: 144 }
                ],
                primeElder: [
                    { time: 0.75, value: 144 },
                    { time: 0.875, value: 160 },
                    { time: 1.0, value: 155 }
                ],
                frailElder: [
                    { time: 0.75, value: 144 },
                    { time: 0.875, value: 148 },
                    { time: 1.0, value: 140 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 24 },
                    { time: 0.25, value: 37.7 },
                    { time: 0.375, value: 62 },
                    { time: 0.5, value: 91 },
                    { time: 0.625, value: 145 },
                    { time: 0.75, value: 196 },
                    { time: 1.0, value: 196 }
                ],
                primeElder: [
                    { time: 0.75, value: 196 },
                    { time: 0.875, value: 220 },
                    { time: 1.0, value: 210 }
                ],
                frailElder: [
                    { time: 0.75, value: 196 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 190 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 151 },
                    { time: 0.25, value: 450 },
                    { time: 0.3, value: 450 },
                    { time: 0.4, value: 475 },
                    { time: 0.5, value: 475 },
                    { time: 0.75, value: 500 },
                    { time: 1.0, value: 500 }
                ],
                primeElder: [
                    { time: 0.75, value: 500 },
                    { time: 0.875, value: 550 },
                    { time: 1.0, value: 540 }
                ],
                frailElder: [
                    { time: 0.75, value: 500 },
                    { time: 0.875, value: 510 },
                    { time: 1.0, value: 490 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 21 },
                    { time: 0.25, value: 75 },
                    { time: 0.375, value: 138 },
                    { time: 0.5, value: 152 },
                    { time: 0.625, value: 152 },
                    { time: 0.75, value: 144 },
                    { time: 1.0, value: 144 }
                ],
                primeElder: [
                    { time: 0.75, value: 144 },
                    { time: 0.875, value: 160 },
                    { time: 1.0, value: 155 }
                ],
                frailElder: [
                    { time: 0.75, value: 144 },
                    { time: 0.875, value: 148 },
                    { time: 1.0, value: 140 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.015 },
                { time: 0.3, value: 0.04 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 },
                { time: 1.0, value: 0.9 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 1.05 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 0.85 },
                { time: 1.0, value: 0.75 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 500, unit: "damage" },
            AltBite: { baseValue: 500, unit: "damage" },
            Lunge: { baseValue: 350, unit: "damage" }
        }
    },
    
    // ==================== 霸王龙 ====================
    Tyrannosaurus: {
        displayName: "Tyrannosaurus",
        chineseName: "霸王龙",
        color: "#ff3b30",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 10 },
                { time: 0.25, value: 200 },
                { time: 0.5, value: 1500 },
                { time: 0.75, value: 5000 },
                { time: 1.0, value: 5000 }
            ],
            primeElder: [
                { time: 0.75, value: 5000 },
                { time: 0.875, value: 6000 },
                { time: 1.0, value: 5800 }
            ],
            frailElder: [
                { time: 0.75, value: 5000 },
                { time: 0.875, value: 5200 },
                { time: 1.0, value: 4600 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 30 },
                    { time: 0.75, value: 80 },
                    { time: 1.0, value: 80 }
                ],
                primeElder: [
                    { time: 0.75, value: 80 },
                    { time: 0.875, value: 80 },
                    { time: 1.0, value: 78 }
                ],
                frailElder: [
                    { time: 0.75, value: 80 },
                    { time: 0.875, value: 76 },
                    { time: 1.0, value: 70 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 50 },
                    { time: 0.75, value: 150 },
                    { time: 1.0, value: 150 }
                ],
                primeElder: [
                    { time: 0.75, value: 150 },
                    { time: 0.875, value: 150 },
                    { time: 1.0, value: 145 }
                ],
                frailElder: [
                    { time: 0.75, value: 150 },
                    { time: 0.875, value: 142 },
                    { time: 1.0, value: 135 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 100 },
                    { time: 0.5, value: 400 },
                    { time: 0.75, value: 600 },
                    { time: 1.0, value: 600 }
                ],
                primeElder: [
                    { time: 0.75, value: 600 },
                    { time: 0.875, value: 650 },
                    { time: 1.0, value: 620 }
                ],
                frailElder: [
                    { time: 0.75, value: 600 },
                    { time: 0.875, value: 580 },
                    { time: 1.0, value: 520 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 25 },
                    { time: 0.75, value: 50 },
                    { time: 1.0, value: 50 }
                ],
                primeElder: [
                    { time: 0.75, value: 50 },
                    { time: 0.875, value: 50 },
                    { time: 1.0, value: 48 }
                ],
                frailElder: [
                    { time: 0.75, value: 50 },
                    { time: 0.875, value: 47 },
                    { time: 1.0, value: 44 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.05 },
                { time: 0.5, value: 0.4 },
                { time: 0.75, value: 1.0 },
                { time: 1.0, value: 0.7 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.1 },
                { time: 1.0, value: 0.95 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 0.8 },
                { time: 1.0, value: 0.65 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 400, unit: "damage" },
            AltBite: { baseValue: 600, unit: "damage" }
        }
    },
    
    // ==================== 三角龙 ====================
    Triceratops: {
        displayName: "Triceratops",
        chineseName: "三角龙",
        color: "#34c759",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 4.0 },
                { time: 0.25, value: 85 },
                { time: 0.35, value: 120 },
                { time: 0.4, value: 850 },
                { time: 0.45, value: 3000 },
                { time: 0.5, value: 3500 },
                { time: 0.65, value: 7000 },
                { time: 0.75, value: 9500 },
                { time: 1.0, value: 9500 }
            ],
            primeElder: [
                { time: 0.75, value: 9500 },
                { time: 0.875, value: 12500 },
                { time: 1.0, value: 12500 }
            ],
            frailElder: [
                { time: 0.75, value: 9500 },
                { time: 0.875, value: 9500 },
                { time: 1.0, value: 9500 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 40 },
                    { time: 0.25, value: 80 },
                    { time: 0.375, value: 96 },
                    { time: 0.5, value: 117 },
                    { time: 0.625, value: 114 },
                    { time: 0.75, value: 124 },
                    { time: 1.0, value: 124 }
                ],
                primeElder: [
                    { time: 0.75, value: 124 },
                    { time: 0.875, value: 124 },
                    { time: 1.0, value: 124 }
                ],
                frailElder: [
                    { time: 0.75, value: 124 },
                    { time: 0.875, value: 124 },
                    { time: 1.0, value: 124 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 90 },
                    { time: 0.25, value: 240 },
                    { time: 0.375, value: 195 },
                    { time: 0.5, value: 222 },
                    { time: 0.625, value: 228 },
                    { time: 0.75, value: 228 },
                    { time: 1.0, value: 228 }
                ],
                primeElder: [
                    { time: 0.75, value: 228 },
                    { time: 0.875, value: 228 },
                    { time: 1.0, value: 228 }
                ],
                frailElder: [
                    { time: 0.75, value: 228 },
                    { time: 0.875, value: 228 },
                    { time: 1.0, value: 228 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 150 },
                    { time: 0.25, value: 450 },
                    { time: 0.34, value: 800 },
                    { time: 0.5, value: 730 },
                    { time: 0.75, value: 650 },
                    { time: 1.0, value: 650 }
                ],
                primeElder: [
                    { time: 0.75, value: 650 },
                    { time: 0.875, value: 700 },
                    { time: 1.0, value: 612.5 }
                ],
                frailElder: [
                    { time: 0.75, value: 650 },
                    { time: 0.875, value: 650 },
                    { time: 1.0, value: 575 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 20 },
                    { time: 0.75, value: 45 },
                    { time: 1.0, value: 45 }
                ],
                primeElder: [
                    { time: 0.75, value: 45 },
                    { time: 0.875, value: 45 },
                    { time: 1.0, value: 45 }
                ],
                frailElder: [
                    { time: 0.75, value: 45 },
                    { time: 0.875, value: 45 },
                    { time: 1.0, value: 45 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.014 },
                { time: 0.3, value: 0.03 },
                { time: 0.4, value: 0.31 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 },
                { time: 1.0, value: 0.7 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.9 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.7 }
            ]
        },
        
        attackDamage: {
            HornStrike: { baseValue: 200, unit: "damage" },
            Charge: { baseValue: 300, unit: "damage" }
        }
    },
    
    // ==================== 剑龙 ====================
    Stegosaurus: {
        displayName: "Stegosaurus",
        chineseName: "剑龙",
        color: "#ff9500",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 4.83 },
                { time: 0.25, value: 125 },
                { time: 0.35, value: 175 },
                { time: 0.4, value: 1600 },
                { time: 0.45, value: 2050 },
                { time: 0.5, value: 2800 },
                { time: 0.625, value: 4500 },
                { time: 0.75, value: 6000 },
                { time: 1.0, value: 6000 }
            ],
            primeElder: [
                { time: 0.75, value: 6000 },
                { time: 0.875, value: 9281 },
                { time: 1.0, value: 9281 }
            ],
            frailElder: [
                { time: 0.75, value: 6000 },
                { time: 0.875, value: 6000 },
                { time: 1.0, value: 6000 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 19 },
                    { time: 0.25, value: 61 },
                    { time: 0.375, value: 116 },
                    { time: 0.5, value: 130 },
                    { time: 0.625, value: 131 },
                    { time: 0.75, value: 124 },
                    { time: 1.0, value: 124 }
                ],
                primeElder: [
                    { time: 0.75, value: 124 },
                    { time: 0.875, value: 124 },
                    { time: 1.0, value: 124 }
                ],
                frailElder: [
                    { time: 0.75, value: 124 },
                    { time: 0.875, value: 124 },
                    { time: 1.0, value: 124 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 46 },
                    { time: 0.25, value: 148 },
                    { time: 0.375, value: 280 },
                    { time: 0.5, value: 309 },
                    { time: 0.625, value: 310 },
                    { time: 0.75, value: 290 },
                    { time: 1.0, value: 290 }
                ],
                primeElder: [
                    { time: 0.75, value: 290 },
                    { time: 0.875, value: 290 },
                    { time: 1.0, value: 290 }
                ],
                frailElder: [
                    { time: 0.75, value: 290 },
                    { time: 0.875, value: 290 },
                    { time: 1.0, value: 290 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 155 },
                    { time: 0.25, value: 500 },
                    { time: 0.375, value: 902 },
                    { time: 0.5, value: 850 },
                    { time: 0.626, value: 845 },
                    { time: 0.75, value: 807 },
                    { time: 1.0, value: 807 }
                ],
                primeElder: [
                    { time: 0.75, value: 807 },
                    { time: 0.875, value: 850 },
                    { time: 1.0, value: 700 }
                ],
                frailElder: [
                    { time: 0.75, value: 807 },
                    { time: 0.875, value: 807 },
                    { time: 1.0, value: 675 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 19 },
                    { time: 0.25, value: 61 },
                    { time: 0.375, value: 116 },
                    { time: 0.5, value: 130 },
                    { time: 0.625, value: 131 },
                    { time: 0.75, value: 124 },
                    { time: 1.0, value: 124 }
                ],
                primeElder: [
                    { time: 0.75, value: 124 },
                    { time: 0.875, value: 124 },
                    { time: 1.0, value: 136 }
                ],
                frailElder: [
                    { time: 0.75, value: 124 },
                    { time: 0.875, value: 124 },
                    { time: 1.0, value: 136 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.35, value: 0.05 },
                { time: 0.45, value: 0.4 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 },
                { time: 1.0, value: 0.75 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.9 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.75 }
            ]
        },
        
        attackDamage: {
            Tail: { baseValue: 700, unit: "damage" },
            PowerSwing: { baseValue: 950, unit: "damage" },
            PowerSwingRunning: { baseValue: 1800, unit: "damage" }
        }
    },


    // ==================== 异特龙 ====================
    Allosaurus: {
        displayName: "Allosaurus",
        chineseName: "异特龙",
        color: "#af52de",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 2.0 },
                { time: 0.25, value: 48 },
                { time: 0.375, value: 84 },
                { time: 0.5, value: 1050 },
                { time: 0.75, value: 2593 }
            ],
            primeElder: [
                { time: 0.75, value: 2593 },
                { time: 0.875, value: 3672 },
                { time: 1.0, value: 3672 }
            ],
            frailElder: [
                { time: 0.75, value: 2593 },
                { time: 0.875, value: 2593 },
                { time: 1.0, value: 2593 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 53 },
                    { time: 0.5, value: 129 },
                    { time: 0.75, value: 170 }
                ],
                primeElder: [
                    { time: 0.75, value: 170 },
                    { time: 0.875, value: 170 },
                    { time: 1.0, value: 170 }
                ],
                frailElder: [
                    { time: 0.75, value: 170 },
                    { time: 0.875, value: 170 },
                    { time: 1.0, value: 170 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 77 },
                    { time: 0.25, value: 180 },
                    { time: 0.5, value: 302 },
                    { time: 0.75, value: 500 }
                ],
                primeElder: [
                    { time: 0.75, value: 500 },
                    { time: 0.875, value: 500 },
                    { time: 1.0, value: 500 }
                ],
                frailElder: [
                    { time: 0.75, value: 500 },
                    { time: 0.875, value: 500 },
                    { time: 1.0, value: 500 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 382 },
                    { time: 0.25, value: 698 },
                    { time: 0.5, value: 1150 },
                    { time: 0.744, value: 1106 },
                    { time: 1.0, value: 934 }
                ],
                primeElder: [
                    { time: 0.75, value: 1106 },
                    { time: 0.875, value: 1106 },
                    { time: 1.0, value: 990 }
                ],
                frailElder: [
                    { time: 0.75, value: 1106 },
                    { time: 0.875, value: 1106 },
                    { time: 1.0, value: 934 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 53 },
                    { time: 1.0, value: 200 }
                ],
                primeElder: [
                    { time: 0.75, value: 200 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 200 }
                ],
                frailElder: [
                    { time: 0.75, value: 200 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 200 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.45, value: 0.1 },
                { time: 0.5, value: 0.45 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.8 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 175, unit: "damage" },
            AltBite: { baseValue: 220, unit: "damage" },
            Knockdown: { baseValue: 300, unit: "damage" },
            Stagger: { baseValue: 250, unit: "damage" },
            ClawSwipe: { baseValue: 250, unit: "damage" },
            "Pounce.PinLoop": { baseValue: 50, unit: "damage" },
            "Pounce.LatchLoop": { baseValue: 35, unit: "damage" },
            "Pounce.GrappleLoop": { baseValue: 50, unit: "damage" }
        }
    },
    
    // ==================== 肿头龙 ====================
    Pachycephalosaurus: {
        displayName: "Pachycephalosaurus",
        chineseName: "肿头龙",
        color: "#ffcc00",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.53 },
                { time: 0.25, value: 13.5 },
                { time: 0.375, value: 125 },
                { time: 0.5, value: 400 },
                { time: 0.75, value: 700 }
            ],
            primeElder: [
                { time: 0.75, value: 700 },
                { time: 0.875, value: 910 },
                { time: 1.0, value: 910 }
            ],
            frailElder: [
                { time: 0.75, value: 700 },
                { time: 0.875, value: 700 },
                { time: 1.0, value: 700 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 25 },
                    { time: 0.25, value: 71 },
                    { time: 0.375, value: 136 },
                    { time: 0.5, value: 154 },
                    { time: 0.625, value: 152 },
                    { time: 0.75, value: 141 }
                ],
                primeElder: [
                    { time: 0.75, value: 141 },
                    { time: 0.875, value: 157 },
                    { time: 1.0, value: 157 }
                ],
                frailElder: [
                    { time: 0.75, value: 141 },
                    { time: 0.875, value: 141 },
                    { time: 1.0, value: 141 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 50 },
                    { time: 0.25, value: 143 },
                    { time: 0.375, value: 303 },
                    { time: 0.5, value: 385 },
                    { time: 0.625, value: 374 },
                    { time: 0.75, value: 352 }
                ],
                primeElder: [
                    { time: 0.75, value: 352 },
                    { time: 0.875, value: 376 },
                    { time: 1.0, value: 376 }
                ],
                frailElder: [
                    { time: 0.75, value: 352 },
                    { time: 0.875, value: 352 },
                    { time: 1.0, value: 352 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 225 },
                    { time: 0.25, value: 650 },
                    { time: 0.375, value: 1210 },
                    { time: 0.5, value: 1330 },
                    { time: 0.625, value: 1288 },
                    { time: 0.75, value: 1161 }
                ],
                primeElder: [
                    { time: 0.75, value: 1161 },
                    { time: 0.875, value: 1293 },
                    { time: 1.0, value: 1100 }
                ],
                frailElder: [
                    { time: 0.75, value: 1161 },
                    { time: 0.875, value: 1161 },
                    { time: 1.0, value: 850 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 25 },
                    { time: 0.25, value: 71 },
                    { time: 0.375, value: 136 },
                    { time: 0.5, value: 154 },
                    { time: 0.625, value: 152 },
                    { time: 0.75, value: 141 }
                ],
                primeElder: [
                    { time: 0.75, value: 141 },
                    { time: 0.875, value: 157 },
                    { time: 1.0, value: 157 }
                ],
                frailElder: [
                    { time: 0.75, value: 141 },
                    { time: 0.875, value: 141 },
                    { time: 1.0, value: 157 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.85 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.65 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 30, unit: "damage" },
            AltBite: { baseValue: 75, unit: "damage" },
            HeadButt: { baseValue: 200, unit: "damage" }
        }
    },
    
    // ==================== 腱龙 ====================
    Tenontosaurus: {
        displayName: "Tenontosaurus",
        chineseName: "腱龙",
        color: "#64d8ff",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.75 },
                { time: 0.25, value: 43.2 },
                { time: 0.375, value: 400 },
                { time: 0.5, value: 800 },
                { time: 0.625, value: 1200 },
                { time: 0.75, value: 1600 }
            ],
            primeElder: [
                { time: 0.75, value: 1600 },
                { time: 0.875, value: 1829 },
                { time: 1.0, value: 1829 }
            ],
            frailElder: [
                { time: 0.75, value: 1600 },
                { time: 0.875, value: 1600 },
                { time: 1.0, value: 1600 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 16 },
                    { time: 0.25, value: 60 },
                    { time: 0.375, value: 127 },
                    { time: 0.5, value: 158 },
                    { time: 0.625, value: 182 },
                    { time: 0.75, value: 200 }
                ],
                primeElder: [
                    { time: 0.75, value: 200 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 200 }
                ],
                frailElder: [
                    { time: 0.75, value: 200 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 200 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 47 },
                    { time: 0.25, value: 180 },
                    { time: 0.375, value: 380 },
                    { time: 0.5, value: 473 },
                    { time: 0.625, value: 546 },
                    { time: 0.75, value: 600 }
                ],
                primeElder: [
                    { time: 0.75, value: 600 },
                    { time: 0.875, value: 600 },
                    { time: 1.0, value: 600 }
                ],
                frailElder: [
                    { time: 0.75, value: 600 },
                    { time: 0.875, value: 600 },
                    { time: 1.0, value: 600 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 155 },
                    { time: 0.25, value: 602 },
                    { time: 0.375, value: 1128 },
                    { time: 0.5, value: 1230 },
                    { time: 0.625, value: 1220 },
                    { time: 0.75, value: 1131 }
                ],
                primeElder: [
                    { time: 0.75, value: 1131 },
                    { time: 0.875, value: 1200 },
                    { time: 1.0, value: 1011 }
                ],
                frailElder: [
                    { time: 0.75, value: 1131 },
                    { time: 0.875, value: 1131 },
                    { time: 1.0, value: 886 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 16 },
                    { time: 0.75, value: 200 }
                ],
                primeElder: [
                    { time: 0.75, value: 200 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 200 }
                ],
                frailElder: [
                    { time: 0.75, value: 200 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 200 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.9 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.7 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 35, unit: "damage" },
            Claw: { baseValue: 130, unit: "damage" },
            Kick: { baseValue: 250, unit: "damage" },
            Tail: { baseValue: 100, unit: "damage" }
        }
    },
    
    // ==================== 无齿翼龙 ====================
    Pteranodon: {
        displayName: "Pteranodon",
        chineseName: "无齿翼龙",
        color: "#5e5ce0",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.0879 },
                { time: 0.25, value: 1.22 },
                { time: 0.375, value: 11.25 },
                { time: 0.5, value: 22.5 },
                { time: 0.625, value: 33.75 },
                { time: 0.75, value: 45 }
            ],
            primeElder: [
                { time: 0.75, value: 45 },
                { time: 0.875, value: 60 },
                { time: 1.0, value: 60 }
            ],
            frailElder: [
                { time: 0.75, value: 45 },
                { time: 0.875, value: 45 },
                { time: 1.0, value: 45 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 5 },
                    { time: 0.25, value: 12 },
                    { time: 0.375, value: 25 },
                    { time: 0.5, value: 32 },
                    { time: 0.625, value: 36 },
                    { time: 0.75, value: 40 }
                ],
                primeElder: [
                    { time: 0.75, value: 40 },
                    { time: 0.875, value: 40 },
                    { time: 1.0, value: 40 }
                ],
                frailElder: [
                    { time: 0.75, value: 40 },
                    { time: 0.875, value: 40 },
                    { time: 1.0, value: 40 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 25 },
                    { time: 0.25, value: 100 },
                    { time: 0.375, value: 126 },
                    { time: 0.5, value: 200 },
                    { time: 0.75, value: 300 }
                ],
                primeElder: [
                    { time: 0.75, value: 300 },
                    { time: 0.875, value: 300 },
                    { time: 1.0, value: 300 }
                ],
                frailElder: [
                    { time: 0.75, value: 300 },
                    { time: 0.875, value: 300 },
                    { time: 1.0, value: 300 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 99 },
                    { time: 0.25, value: 238 },
                    { time: 0.375, value: 499 },
                    { time: 0.5, value: 623 },
                    { time: 0.625, value: 721 },
                    { time: 0.75, value: 792 }
                ],
                primeElder: [
                    { time: 0.75, value: 792 },
                    { time: 0.875, value: 871 },
                    { time: 1.0, value: 750 }
                ],
                frailElder: [
                    { time: 0.75, value: 792 },
                    { time: 0.875, value: 792 },
                    { time: 1.0, value: 650 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 5 },
                    { time: 0.25, value: 12 },
                    { time: 0.375, value: 25 },
                    { time: 0.5, value: 32 },
                    { time: 0.625, value: 36 },
                    { time: 0.75, value: 40 }
                ],
                primeElder: [
                    { time: 0.75, value: 40 },
                    { time: 0.875, value: 40 },
                    { time: 1.0, value: 44 }
                ],
                frailElder: [
                    { time: 0.75, value: 40 },
                    { time: 0.875, value: 40 },
                    { time: 1.0, value: 44 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.8 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 20, unit: "damage" },
            AltBite: { baseValue: 30, unit: "damage" }
        }
    },
    
    // ==================== 角鼻龙 ====================
    Ceratosaurus: {
        displayName: "Ceratosaurus",
        chineseName: "角鼻龙",
        color: "#ff6b6b",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 1.78 },
                { time: 0.25, value: 35.1 },
                { time: 0.375, value: 325 },
                { time: 0.5, value: 600 },
                { time: 0.625, value: 975 },
                { time: 0.75, value: 1450 }
            ],
            primeElder: [
                { time: 0.75, value: 1450 },
                { time: 0.875, value: 1950 },
                { time: 1.0, value: 1950 }
            ],
            frailElder: [
                { time: 0.75, value: 1450 },
                { time: 0.875, value: 1450 },
                { time: 1.0, value: 1450 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 24 },
                    { time: 0.25, value: 65 },
                    { time: 0.375, value: 134 },
                    { time: 0.5, value: 163 },
                    { time: 0.625, value: 185 },
                    { time: 0.75, value: 198 }
                ],
                primeElder: [
                    { time: 0.75, value: 198 },
                    { time: 0.875, value: 198 },
                    { time: 1.0, value: 220 }
                ],
                frailElder: [
                    { time: 0.75, value: 198 },
                    { time: 0.875, value: 198 },
                    { time: 1.0, value: 220 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 90 },
                    { time: 0.25, value: 275 },
                    { time: 0.375, value: 410 },
                    { time: 0.5, value: 450 },
                    { time: 0.625, value: 480 },
                    { time: 0.75, value: 495 }
                ],
                primeElder: [
                    { time: 0.75, value: 495 },
                    { time: 0.875, value: 495 },
                    { time: 1.0, value: 550 }
                ],
                frailElder: [
                    { time: 0.75, value: 495 },
                    { time: 0.875, value: 495 },
                    { time: 1.0, value: 550 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 241 },
                    { time: 0.25, value: 578 },
                    { time: 0.375, value: 900 },
                    { time: 0.5, value: 1050 },
                    { time: 0.625, value: 1100 },
                    { time: 0.75, value: 1120 }
                ],
                primeElder: [
                    { time: 0.75, value: 1120 },
                    { time: 0.875, value: 1120 },
                    { time: 1.0, value: 1000 }
                ],
                frailElder: [
                    { time: 0.75, value: 1120 },
                    { time: 0.875, value: 1120 },
                    { time: 1.0, value: 920 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 24 },
                    { time: 0.25, value: 65 },
                    { time: 0.375, value: 134 },
                    { time: 0.5, value: 163 },
                    { time: 0.625, value: 185 },
                    { time: 0.75, value: 198 }
                ],
                primeElder: [
                    { time: 0.75, value: 198 },
                    { time: 0.875, value: 198 },
                    { time: 1.0, value: 220 }
                ],
                frailElder: [
                    { time: 0.75, value: 198 },
                    { time: 0.875, value: 198 },
                    { time: 1.0, value: 220 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.85 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.65 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 150, unit: "damage" },
            AltBite: { baseValue: 200, unit: "damage" }
        }
    },
    
    // ==================== 橡树龙 ====================
    Dryosaurus: {
        displayName: "Dryosaurus",
        chineseName: "橡树龙",
        color: "#32cd32",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.11 },
                { time: 0.25, value: 6.86 },
                { time: 0.375, value: 32.5 },
                { time: 0.5, value: 65 },
                { time: 0.625, value: 97.5 },
                { time: 0.75, value: 130 }
            ],
            primeElder: [
                { time: 0.75, value: 130 },
                { time: 0.875, value: 185 },
                { time: 1.0, value: 185 }
            ],
            frailElder: [
                { time: 0.75, value: 130 },
                { time: 0.875, value: 130 },
                { time: 1.0, value: 130 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 13 },
                    { time: 0.25, value: 53 },
                    { time: 0.375, value: 88 },
                    { time: 0.5, value: 110 },
                    { time: 0.625, value: 128 },
                    { time: 0.75, value: 140 }
                ],
                primeElder: [
                    { time: 0.75, value: 140 },
                    { time: 0.875, value: 140 },
                    { time: 1.0, value: 158 }
                ],
                frailElder: [
                    { time: 0.75, value: 140 },
                    { time: 0.875, value: 140 },
                    { time: 1.0, value: 158 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 39 },
                    { time: 0.25, value: 158 },
                    { time: 0.375, value: 263 },
                    { time: 0.5, value: 331 },
                    { time: 0.625, value: 383 },
                    { time: 0.75, value: 420 }
                ],
                primeElder: [
                    { time: 0.75, value: 420 },
                    { time: 0.875, value: 420 },
                    { time: 1.0, value: 473 }
                ],
                frailElder: [
                    { time: 0.75, value: 420 },
                    { time: 0.875, value: 420 },
                    { time: 1.0, value: 473 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 152 },
                    { time: 0.25, value: 609 },
                    { time: 0.375, value: 949 },
                    { time: 0.5, value: 1112 },
                    { time: 0.625, value: 1215 },
                    { time: 0.75, value: 1250 }
                ],
                primeElder: [
                    { time: 0.75, value: 1250 },
                    { time: 0.875, value: 1400 },
                    { time: 1.0, value: 1100 }
                ],
                frailElder: [
                    { time: 0.75, value: 1250 },
                    { time: 0.875, value: 1250 },
                    { time: 1.0, value: 900 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 13 },
                    { time: 0.25, value: 53 },
                    { time: 0.375, value: 88 },
                    { time: 0.5, value: 110 },
                    { time: 0.625, value: 128 },
                    { time: 0.75, value: 140 }
                ],
                primeElder: [
                    { time: 0.75, value: 140 },
                    { time: 0.875, value: 140 },
                    { time: 1.0, value: 158 }
                ],
                frailElder: [
                    { time: 0.75, value: 140 },
                    { time: 0.875, value: 140 },
                    { time: 1.0, value: 158 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.8 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 20, unit: "damage" },
            DirFront: { baseValue: 20, unit: "damage" },
            DirTail: { baseValue: 25, unit: "damage" }
        }
    },
    
    // ==================== 慈母龙 ====================
    Maiasaura: {
        displayName: "Maiasaura",
        chineseName: "慈母龙",
        color: "#d4af37",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 4.0 },
                { time: 0.25, value: 83 },
                { time: 0.375, value: 988.13 },
                { time: 0.5, value: 1875 },
                { time: 0.625, value: 2812.5 },
                { time: 0.75, value: 3750 },
                { time: 1.0, value: 3750 }
            ],
            primeElder: [
                { time: 0.75, value: 3750 },
                { time: 0.875, value: 5350 },
                { time: 1.0, value: 5350 }
            ],
            frailElder: [
                { time: 0.75, value: 3750 },
                { time: 0.875, value: 3750 },
                { time: 1.0, value: 3750 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 40 },
                    { time: 0.25, value: 100 },
                    { time: 0.375, value: 142 },
                    { time: 0.5, value: 164 },
                    { time: 0.625, value: 175 },
                    { time: 0.75, value: 182 },
                    { time: 1.0, value: 182 }
                ],
                primeElder: [
                    { time: 0.75, value: 182 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 182.5 }
                ],
                frailElder: [
                    { time: 0.75, value: 182 },
                    { time: 0.875, value: 182 },
                    { time: 1.0, value: 167.5 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 167 },
                    { time: 0.25, value: 225 },
                    { time: 0.375, value: 319 },
                    { time: 0.5, value: 396 },
                    { time: 0.625, value: 451 },
                    { time: 0.75, value: 500 },
                    { time: 1.0, value: 500 }
                ],
                primeElder: [
                    { time: 0.75, value: 500 },
                    { time: 0.875, value: 575 },
                    { time: 1.0, value: 500 }
                ],
                frailElder: [
                    { time: 0.75, value: 500 },
                    { time: 0.875, value: 500 },
                    { time: 1.0, value: 325 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 360 },
                    { time: 0.25, value: 540 },
                    { time: 0.375, value: 843 },
                    { time: 0.5, value: 1041 },
                    { time: 0.625, value: 1176 },
                    { time: 0.75, value: 1304 },
                    { time: 1.0, value: 1304 }
                ],
                primeElder: [
                    { time: 0.75, value: 1304 },
                    { time: 0.875, value: 1350 },
                    { time: 1.0, value: 1000 }
                ],
                frailElder: [
                    { time: 0.75, value: 1304 },
                    { time: 0.875, value: 1300 },
                    { time: 1.0, value: 1000 }
                ]
            },
            sprintBiped: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 270 },
                    { time: 0.25, value: 405 },
                    { time: 0.375, value: 618 },
                    { time: 0.5, value: 978 },
                    { time: 0.625, value: 875 },
                    { time: 0.75, value: 875 },
                    { time: 1.0, value: 875 }
                ],
                primeElder: [
                    { time: 0.75, value: 875 },
                    { time: 0.875, value: 875 },
                    { time: 1.0, value: 850 }
                ],
                frailElder: [
                    { time: 0.75, value: 875 },
                    { time: 0.875, value: 875 },
                    { time: 1.0, value: 800 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 40 },
                    { time: 0.25, value: 100 },
                    { time: 0.375, value: 142 },
                    { time: 0.5, value: 164 },
                    { time: 0.625, value: 175 },
                    { time: 0.75, value: 182 },
                    { time: 1.0, value: 182 }
                ],
                primeElder: [
                    { time: 0.75, value: 182 },
                    { time: 0.875, value: 200 },
                    { time: 1.0, value: 182.5 }
                ],
                frailElder: [
                    { time: 0.75, value: 182 },
                    { time: 0.875, value: 182 },
                    { time: 1.0, value: 167.5 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.8 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 50, unit: "damage" },
            AltBite: { baseValue: 150, unit: "damage" }
        }
    },
    
    // ==================== 双冠龙 ====================
    Dilophosaurus: {
        displayName: "Dilophosaurus",
        chineseName: "双冠龙",
        color: "#9b59b6",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 1.14 },
                { time: 0.25, value: 20.03 },
                { time: 0.375, value: 175 },
                { time: 0.5, value: 350 },
                { time: 0.625, value: 525 },
                { time: 0.75, value: 700 }
            ],
            primeElder: [
                { time: 0.75, value: 700 },
                { time: 0.875, value: 977.26 },
                { time: 1.0, value: 977.26 }
            ],
            frailElder: [
                { time: 0.75, value: 700 },
                { time: 0.875, value: 700 },
                { time: 1.0, value: 700 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 11 },
                    { time: 0.25, value: 30 },
                    { time: 0.5, value: 73 },
                    { time: 0.75, value: 92 }
                ],
                primeElder: [
                    { time: 0.75, value: 92 },
                    { time: 0.875, value: 92 },
                    { time: 1.0, value: 100 }
                ],
                frailElder: [
                    { time: 0.75, value: 92 },
                    { time: 0.875, value: 92 },
                    { time: 1.0, value: 100 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 55 },
                    { time: 0.25, value: 175 },
                    { time: 0.5, value: 440 },
                    { time: 0.75, value: 535 }
                ],
                primeElder: [
                    { time: 0.75, value: 535 },
                    { time: 0.875, value: 535 },
                    { time: 1.0, value: 590 }
                ],
                frailElder: [
                    { time: 0.75, value: 535 },
                    { time: 0.875, value: 535 },
                    { time: 1.0, value: 590 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 220 },
                    { time: 0.25, value: 695 },
                    { time: 0.375, value: 1300 },
                    { time: 0.5, value: 1400 },
                    { time: 0.625, value: 1410 },
                    { time: 0.75, value: 1320 }
                ],
                primeElder: [
                    { time: 0.75, value: 1320 },
                    { time: 0.875, value: 1452 },
                    { time: 1.0, value: 1150 }
                ],
                frailElder: [
                    { time: 0.75, value: 1320 },
                    { time: 0.875, value: 1320 },
                    { time: 1.0, value: 985 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 11 },
                    { time: 0.25, value: 30 },
                    { time: 0.5, value: 73 },
                    { time: 0.75, value: 92 }
                ],
                primeElder: [
                    { time: 0.75, value: 92 },
                    { time: 0.875, value: 92 },
                    { time: 1.0, value: 100 }
                ],
                frailElder: [
                    { time: 0.75, value: 92 },
                    { time: 0.875, value: 92 },
                    { time: 1.0, value: 100 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.8 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 85, unit: "damage" },
            AltBite: { baseValue: 125, unit: "damage" }
        }
    },
    
    // ==================== 似鸡龙 ====================
    Gallimimus: {
        displayName: "Gallimimus",
        chineseName: "似鸡龙",
        color: "#f39c12",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.43 },
                { time: 0.25, value: 11.48 },
                { time: 0.375, value: 106.25 },
                { time: 0.5, value: 212.5 },
                { time: 0.625, value: 318.75 },
                { time: 0.75, value: 535 }
            ],
            primeElder: [
                { time: 0.75, value: 535 },
                { time: 0.875, value: 560 },
                { time: 1.0, value: 560 }
            ],
            frailElder: [
                { time: 0.75, value: 535 },
                { time: 0.875, value: 535 },
                { time: 1.0, value: 535 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 75 },
                    { time: 0.25, value: 225 },
                    { time: 0.75, value: 225 }
                ],
                primeElder: [
                    { time: 0.75, value: 225 },
                    { time: 0.875, value: 225 },
                    { time: 1.0, value: 225 }
                ],
                frailElder: [
                    { time: 0.75, value: 225 },
                    { time: 0.875, value: 225 },
                    { time: 1.0, value: 225 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 122 },
                    { time: 0.25, value: 365 },
                    { time: 0.75, value: 1000 }
                ],
                primeElder: [
                    { time: 0.75, value: 1000 },
                    { time: 0.875, value: 1000 },
                    { time: 1.0, value: 850 }
                ],
                frailElder: [
                    { time: 0.75, value: 1000 },
                    { time: 0.875, value: 1000 },
                    { time: 1.0, value: 650 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 588 },
                    { time: 0.25, value: 1300 },
                    { time: 0.75, value: 1300 }
                ],
                primeElder: [
                    { time: 0.75, value: 1300 },
                    { time: 0.875, value: 1500 },
                    { time: 1.0, value: 1150 }
                ],
                frailElder: [
                    { time: 0.75, value: 1300 },
                    { time: 0.875, value: 1300 },
                    { time: 1.0, value: 950 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 75 },
                    { time: 0.25, value: 225 },
                    { time: 0.75, value: 225 }
                ],
                primeElder: [
                    { time: 0.75, value: 225 },
                    { time: 0.875, value: 225 },
                    { time: 1.0, value: 225 }
                ],
                frailElder: [
                    { time: 0.75, value: 225 },
                    { time: 0.875, value: 225 },
                    { time: 1.0, value: 225 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.8 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 25, unit: "damage" },
            AltBite: { baseValue: 70, unit: "damage" },
            Kick: { baseValue: 70, unit: "damage" }
        }
    },
    
    // ==================== 北票龙 ====================
    Beipiaosaurus: {
        displayName: "Beipiaosaurus",
        chineseName: "北票龙",
        color: "#e67e22",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.09 },
                { time: 0.25, value: 2.43 },
                { time: 0.375, value: 22.5 },
                { time: 0.5, value: 45 },
                { time: 0.625, value: 67.5 },
                { time: 0.75, value: 90 }
            ],
            primeElder: [
                { time: 0.75, value: 90 },
                { time: 0.875, value: 90 },
                { time: 1.0, value: 90 }
            ],
            frailElder: [
                { time: 0.75, value: 90 },
                { time: 0.875, value: 90 },
                { time: 1.0, value: 90 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 19 },
                    { time: 0.25, value: 56 },
                    { time: 0.375, value: 75 },
                    { time: 0.5, value: 85 },
                    { time: 0.625, value: 95 },
                    { time: 0.75, value: 100 }
                ],
                primeElder: [
                    { time: 0.75, value: 100 },
                    { time: 0.875, value: 100 },
                    { time: 1.0, value: 110 }
                ],
                frailElder: [
                    { time: 0.75, value: 100 },
                    { time: 0.875, value: 100 },
                    { time: 1.0, value: 110 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 42 },
                    { time: 0.25, value: 125 },
                    { time: 0.375, value: 250 },
                    { time: 0.5, value: 297 },
                    { time: 0.625, value: 320 },
                    { time: 0.75, value: 328 }
                ],
                primeElder: [
                    { time: 0.75, value: 328 },
                    { time: 0.875, value: 328 },
                    { time: 1.0, value: 361 }
                ],
                frailElder: [
                    { time: 0.75, value: 328 },
                    { time: 0.875, value: 328 },
                    { time: 1.0, value: 361 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 98 },
                    { time: 0.25, value: 293 },
                    { time: 0.375, value: 650 },
                    { time: 0.5, value: 900 },
                    { time: 0.625, value: 890 },
                    { time: 0.75, value: 889 }
                ],
                primeElder: [
                    { time: 0.75, value: 889 },
                    { time: 0.875, value: 889 },
                    { time: 1.0, value: 820 }
                ],
                frailElder: [
                    { time: 0.75, value: 889 },
                    { time: 0.875, value: 889 },
                    { time: 1.0, value: 745 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 19 },
                    { time: 0.25, value: 56 },
                    { time: 0.375, value: 75 },
                    { time: 0.625, value: 95 },
                    { time: 0.75, value: 100 }
                ],
                primeElder: [
                    { time: 0.75, value: 100 },
                    { time: 0.875, value: 100 },
                    { time: 1.0, value: 110 }
                ],
                frailElder: [
                    { time: 0.75, value: 100 },
                    { time: 0.875, value: 100 },
                    { time: 1.0, value: 110 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.8 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 20, unit: "damage" },
            Claw: { baseValue: 30, unit: "damage" },
            DirectionalClaw: { baseValue: 23.33, unit: "damage" }
        }
    },
    
    // ==================== 伤齿龙 ====================
    Troodon: {
        displayName: "Troodon",
        chineseName: "伤齿龙",
        color: "#1abc9c",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.06 },
                { time: 0.25, value: 1.62 },
                { time: 0.375, value: 15 },
                { time: 0.5, value: 30 },
                { time: 0.625, value: 45 },
                { time: 0.75, value: 60 }
            ],
            primeElder: [
                { time: 0.75, value: 60 },
                { time: 0.875, value: 79.86 },
                { time: 1.0, value: 79.86 }
            ],
            frailElder: [
                { time: 0.75, value: 60 },
                { time: 0.875, value: 60 },
                { time: 1.0, value: 60 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 35 },
                    { time: 0.25, value: 45 },
                    { time: 0.5, value: 110 },
                    { time: 0.75, value: 130 }
                ],
                primeElder: [
                    { time: 0.75, value: 130 },
                    { time: 0.875, value: 140 },
                    { time: 1.0, value: 140 }
                ],
                frailElder: [
                    { time: 0.75, value: 130 },
                    { time: 0.875, value: 130 },
                    { time: 1.0, value: 130 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 90 },
                    { time: 0.25, value: 125 },
                    { time: 0.5, value: 525 },
                    { time: 0.75, value: 525 }
                ],
                primeElder: [
                    { time: 0.75, value: 525 },
                    { time: 0.875, value: 575 },
                    { time: 1.0, value: 575 }
                ],
                frailElder: [
                    { time: 0.75, value: 525 },
                    { time: 0.875, value: 525 },
                    { time: 1.0, value: 525 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 175 },
                    { time: 0.25, value: 350 },
                    { time: 0.5, value: 1150 },
                    { time: 0.75, value: 1250 }
                ],
                primeElder: [
                    { time: 0.75, value: 1250 },
                    { time: 0.875, value: 1450 },
                    { time: 1.0, value: 1150 }
                ],
                frailElder: [
                    { time: 0.75, value: 1250 },
                    { time: 0.875, value: 1250 },
                    { time: 1.0, value: 925 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 45 },
                    { time: 0.25, value: 90 },
                    { time: 0.5, value: 110 },
                    { time: 0.75, value: 130 }
                ],
                primeElder: [
                    { time: 0.75, value: 130 },
                    { time: 0.875, value: 130 },
                    { time: 1.0, value: 140 }
                ],
                frailElder: [
                    { time: 0.75, value: 130 },
                    { time: 0.875, value: 130 },
                    { time: 1.0, value: 140 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.9 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.7 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 15, unit: "damage" },
            AltBite: { baseValue: 15, unit: "damage" },
            "Pounce.PinLoop": { baseValue: 3.5, unit: "damage" }
        }
    },
    
    // ==================== 棱齿龙 ====================
    Hypsilophodon: {
        displayName: "Hypsilophodon",
        chineseName: "棱齿龙",
        color: "#2ecc71",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.02 },
                { time: 0.25, value: 0.5 },
                { time: 0.375, value: 5 },
                { time: 0.5, value: 10 },
                { time: 0.625, value: 15 },
                { time: 0.75, value: 20 }
            ],
            primeElder: [
                { time: 0.75, value: 20 },
                { time: 0.9, value: 23 },
                { time: 1.0, value: 23 }
            ],
            frailElder: [
                { time: 0.75, value: 20 },
                { time: 0.875, value: 20 },
                { time: 1.0, value: 20 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 15 },
                    { time: 0.25, value: 45 },
                    { time: 0.375, value: 95 },
                    { time: 0.5, value: 119 },
                    { time: 0.625, value: 137 },
                    { time: 0.75, value: 150 }
                ],
                primeElder: [
                    { time: 0.75, value: 150 },
                    { time: 0.875, value: 150 },
                    { time: 1.0, value: 150 }
                ],
                frailElder: [
                    { time: 0.75, value: 150 },
                    { time: 0.875, value: 150 },
                    { time: 1.0, value: 150 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 35 },
                    { time: 0.25, value: 105 },
                    { time: 0.375, value: 221 },
                    { time: 0.5, value: 277 },
                    { time: 0.625, value: 319 },
                    { time: 0.75, value: 350 }
                ],
                primeElder: [
                    { time: 0.75, value: 350 },
                    { time: 0.875, value: 350 },
                    { time: 1.0, value: 350 }
                ],
                frailElder: [
                    { time: 0.75, value: 350 },
                    { time: 0.875, value: 350 },
                    { time: 1.0, value: 350 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 110 },
                    { time: 0.25, value: 330 },
                    { time: 0.375, value: 693 },
                    { time: 0.5, value: 869 },
                    { time: 0.625, value: 1001 },
                    { time: 0.75, value: 1100 }
                ],
                primeElder: [
                    { time: 0.75, value: 1100 },
                    { time: 0.875, value: 1100 },
                    { time: 1.0, value: 1050 }
                ],
                frailElder: [
                    { time: 0.75, value: 1100 },
                    { time: 0.875, value: 1100 },
                    { time: 1.0, value: 850 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 15 },
                    { time: 0.25, value: 45 },
                    { time: 0.375, value: 95 },
                    { time: 0.5, value: 119 },
                    { time: 0.625, value: 137 },
                    { time: 0.75, value: 150 }
                ],
                primeElder: [
                    { time: 0.75, value: 150 },
                    { time: 0.875, value: 150 },
                    { time: 1.0, value: 165 }
                ],
                frailElder: [
                    { time: 0.75, value: 150 },
                    { time: 0.875, value: 150 },
                    { time: 1.0, value: 165 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.9 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.7 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 2, unit: "damage" }
        }
    },
    
    // ==================== 钉状龙 ====================
    Kentrosaurus: {
        displayName: "Kentrosaurus",
        chineseName: "钉状龙",
        color: "#f1c40f",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 1.0 },
                { time: 0.25, value: 38 },
                { time: 0.35, value: 70 },
                { time: 0.5, value: 1000 },
                { time: 0.65, value: 1700 },
                { time: 0.75, value: 1950 }
            ],
            primeElder: [
                { time: 0.75, value: 1950 },
                { time: 0.875, value: 2250 },
                { time: 1.0, value: 2250 }
            ],
            frailElder: [
                { time: 0.75, value: 1950 },
                { time: 0.875, value: 1950 },
                { time: 1.0, value: 1950 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 15 },
                    { time: 0.25, value: 50 },
                    { time: 0.35, value: 60 },
                    { time: 0.5, value: 70 },
                    { time: 0.75, value: 153 }
                ],
                primeElder: [
                    { time: 0.75, value: 153 },
                    { time: 0.875, value: 153 },
                    { time: 1.0, value: 153 }
                ],
                frailElder: [
                    { time: 0.75, value: 153 },
                    { time: 0.875, value: 153 },
                    { time: 1.0, value: 153 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 56 },
                    { time: 0.25, value: 150 },
                    { time: 0.35, value: 225 },
                    { time: 0.5, value: 390 },
                    { time: 0.75, value: 468 }
                ],
                primeElder: [
                    { time: 0.75, value: 468 },
                    { time: 0.875, value: 468 },
                    { time: 1.0, value: 468 }
                ],
                frailElder: [
                    { time: 0.75, value: 468 },
                    { time: 0.875, value: 468 },
                    { time: 1.0, value: 468 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 120 },
                    { time: 0.25, value: 498 },
                    { time: 0.501, value: 1050 },
                    { time: 0.75, value: 950 }
                ],
                primeElder: [
                    { time: 0.75, value: 950 },
                    { time: 0.875, value: 1050 },
                    { time: 1.0, value: 825 }
                ],
                frailElder: [
                    { time: 0.75, value: 950 },
                    { time: 0.875, value: 950 },
                    { time: 1.0, value: 625 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: []
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.01 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.85 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.65 }
            ]
        },
        
        attackDamage: {
            Tail: { baseValue: 325, unit: "damage" },
            PowerSwing: { baseValue: 700, unit: "damage" },
            DefensiveStanceAttack: { baseValue: 200, unit: "damage" },
            ShoulderCheck: { baseValue: 200, unit: "damage" }
        }
    },
    
    // ==================== 恶魔角龙 ====================
    Diabloceratops: {
        displayName: "Diabloceratops",
        chineseName: "恶魔角龙",
        color: "#e74c3c",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 3.0 },
                { time: 0.25, value: 81 },
                { time: 0.375, value: 750 },
                { time: 0.5, value: 1500 },
                { time: 0.625, value: 2250 },
                { time: 0.75, value: 3000 }
            ],
            primeElder: [
                { time: 0.75, value: 3000 },
                { time: 0.875, value: 3875 },
                { time: 1.0, value: 3875 }
            ],
            frailElder: [
                { time: 0.75, value: 3000 },
                { time: 0.875, value: 3000 },
                { time: 1.0, value: 3000 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 15 },
                    { time: 0.25, value: 45 },
                    { time: 0.75, value: 121 }
                ],
                primeElder: [
                    { time: 0.75, value: 121 },
                    { time: 0.875, value: 121 },
                    { time: 1.0, value: 133 }
                ],
                frailElder: [
                    { time: 0.75, value: 121 },
                    { time: 0.875, value: 121 },
                    { time: 1.0, value: 133 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 30 },
                    { time: 0.25, value: 115 },
                    { time: 0.75, value: 350 }
                ],
                primeElder: [
                    { time: 0.75, value: 350 },
                    { time: 0.875, value: 350 },
                    { time: 1.0, value: 415 }
                ],
                frailElder: [
                    { time: 0.75, value: 350 },
                    { time: 0.875, value: 350 },
                    { time: 1.0, value: 415 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 105 },
                    { time: 0.25, value: 350 },
                    { time: 0.393, value: 765 },
                    { time: 0.5, value: 1000 },
                    { time: 0.7, value: 950 },
                    { time: 0.875, value: 950 }
                ],
                primeElder: [
                    { time: 0.75, value: 950 },
                    { time: 0.875, value: 1050 },
                    { time: 1.0, value: 900 }
                ],
                frailElder: [
                    { time: 0.75, value: 950 },
                    { time: 0.875, value: 950 },
                    { time: 1.0, value: 800 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 10.9287 },
                    { time: 0.25, value: 30.25 },
                    { time: 0.75, value: 810 }
                ],
                primeElder: [
                    { time: 0.75, value: 810 },
                    { time: 0.875, value: 810 },
                    { time: 1.0, value: 810 }
                ],
                frailElder: [
                    { time: 0.75, value: 810 },
                    { time: 0.875, value: 810 },
                    { time: 1.0, value: 810 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.8 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 275, unit: "damage" },
            AltBite: { baseValue: 300, unit: "damage" },
            Flip: { baseValue: 350, unit: "damage" },
            Thrash: { baseValue: 100, unit: "damage" },
            ThrashKnockdown: { baseValue: 300, unit: "damage" },
            Engage: { baseValue: 350, unit: "damage" },
            SparTurn: { baseValue: 200, unit: "damage" }
        }
    },
    
    // ==================== 埃雷拉龙 ====================
    Herrerasaurus: {
        displayName: "Herrerasaurus",
        chineseName: "埃雷拉龙",
        color: "#e67e22",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.18 },
                { time: 0.25, value: 4.73 },
                { time: 0.75, value: 175 }
            ],
            primeElder: [
                { time: 0.75, value: 175 },
                { time: 0.875, value: 225 },
                { time: 1.0, value: 225 }
            ],
            frailElder: [
                { time: 0.75, value: 175 },
                { time: 0.875, value: 175 },
                { time: 1.0, value: 175 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 9 },
                    { time: 0.25, value: 30 },
                    { time: 0.75, value: 71.88 }
                ],
                primeElder: [
                    { time: 0.75, value: 71.88 },
                    { time: 0.875, value: 71.88 },
                    { time: 1.0, value: 94 }
                ],
                frailElder: [
                    { time: 0.75, value: 71.88 },
                    { time: 0.875, value: 71.88 },
                    { time: 1.0, value: 94 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 45 },
                    { time: 0.25, value: 140 },
                    { time: 0.75, value: 420 }
                ],
                primeElder: [
                    { time: 0.75, value: 420 },
                    { time: 0.875, value: 420 },
                    { time: 1.0, value: 373.95 }
                ],
                frailElder: [
                    { time: 0.75, value: 420 },
                    { time: 0.875, value: 420 },
                    { time: 1.0, value: 326.28 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 130 },
                    { time: 0.25, value: 420 },
                    { time: 0.75, value: 1250 }
                ],
                primeElder: [
                    { time: 0.75, value: 1250 },
                    { time: 0.875, value: 1300 },
                    { time: 1.0, value: 1046.18 }
                ],
                frailElder: [
                    { time: 0.75, value: 1250 },
                    { time: 0.875, value: 1250 },
                    { time: 1.0, value: 796.18 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 9 },
                    { time: 0.25, value: 30 },
                    { time: 0.75, value: 71.88 }
                ],
                primeElder: [
                    { time: 0.75, value: 71.88 },
                    { time: 0.875, value: 71.88 },
                    { time: 1.0, value: 94 }
                ],
                frailElder: [
                    { time: 0.75, value: 71.88 },
                    { time: 0.875, value: 71.88 },
                    { time: 1.0, value: 94 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.8 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.6 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 30, unit: "damage" },
            AltBite: { baseValue: 50, unit: "damage" },
            DropStagger: { baseValue: 150, unit: "damage" },
            DropKnockdown: { baseValue: 225, unit: "damage" }
        }
    },
    

    
    // ==================== 犹他盗龙 (Omniraptor) ====================
    Utahraptor: {
        displayName: "Omniraptor",
        chineseName: "全能盗龙",
        color: "#af52de",
        
        weight: {
            unit: "kg",
            standard: [
                { time: 0, value: 0.53 },
                { time: 0.25, value: 12.15 },
                { time: 0.375, value: 112.5 },
                { time: 0.5, value: 225.0 },
                { time: 0.625, value: 337.5 },
                { time: 0.75, value: 395.0 }
            ],
            primeElder: [
                { time: 0.75, value: 395.0 },
                { time: 0.875, value: 660.0 },
                { time: 1.0, value: 660.0 }
            ],
            frailElder: [
                { time: 0.75, value: 395.0 },
                { time: 0.875, value: 395.0 },
                { time: 1.0, value: 395.0 }
            ]
        },
        
        speeds: {
            walk: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 36.0 },
                    { time: 0.25, value: 104.0 },
                    { time: 0.375, value: 150.0 },
                    { time: 0.5, value: 165.0 },
                    { time: 0.625, value: 160.0 },
                    { time: 0.75, value: 153.0 }
                ],
                primeElder: [
                    { time: 0.75, value: 153.0 },
                    { time: 0.875, value: 153.0 },
                    { time: 1.0, value: 153.0 }
                ],
                frailElder: [
                    { time: 0.75, value: 153.0 },
                    { time: 0.875, value: 153.0 },
                    { time: 1.0, value: 153.0 }
                ]
            },
            trot: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 72.0 },
                    { time: 0.25, value: 208.0 },
                    { time: 0.375, value: 405.0 },
                    { time: 0.5, value: 469.0 },
                    { time: 0.625, value: 501.0 },
                    { time: 0.75, value: 510.0 }
                ],
                primeElder: [
                    { time: 0.75, value: 510.0 },
                    { time: 0.875, value: 570.0 },
                    { time: 1.0, value: 570.0 }
                ],
                frailElder: [
                    { time: 0.75, value: 510.0 },
                    { time: 0.875, value: 510.0 },
                    { time: 1.0, value: 510.0 }
                ]
            },
            sprint: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 242.0 },
                    { time: 0.25, value: 698.0 },
                    { time: 0.375, value: 1287.0 },
                    { time: 0.5, value: 1396.0 },
                    { time: 0.625, value: 1391.0 },
                    { time: 0.75, value: 1300.0 }
                ],
                primeElder: [
                    { time: 0.75, value: 1300.0 },
                    { time: 0.875, value: 1454.0 },
                    { time: 1.0, value: 1200.0 }
                ],
                frailElder: [
                    { time: 0.75, value: 1300.0 },
                    { time: 0.875, value: 1300.0 },
                    { time: 1.0, value: 975.0 }
                ]
            },
            crouch: {
                unit: "cm/s",
                standard: [
                    { time: 0, value: 36.0 },
                    { time: 0.25, value: 104.0 },
                    { time: 0.375, value: 150.0 },
                    { time: 0.5, value: 165.0 },
                    { time: 0.625, value: 160.0 },
                    { time: 0.75, value: 153.0 }
                ],
                primeElder: [
                    { time: 0.75, value: 153.0 },
                    { time: 0.875, value: 171.0 },
                    { time: 1.0, value: 153.0 }
                ],
                frailElder: [
                    { time: 0.75, value: 153.0 },
                    { time: 0.875, value: 153.0 },
                    { time: 1.0, value: 153.0 }
                ]
            }
        },
        
        attackPower: {
            standard: [
                { time: 0, value: 0.001 },
                { time: 0.25, value: 0.03 },
                { time: 0.6, value: 0.65 },
                { time: 0.75, value: 1.0 }
            ],
            primeElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.15 },
                { time: 1.0, value: 0.9 }
            ],
            frailElder: [
                { time: 0.75, value: 1.0 },
                { time: 0.875, value: 1.0 },
                { time: 1.0, value: 0.7 }
            ]
        },
        
        attackDamage: {
            Bite: { baseValue: 65, unit: "damage" },
            AltBite: { baseValue: 75, unit: "damage" },
            "Pounce.PinLoop": { baseValue: 35, unit: "damage" },
            "Pounce.LatchLoop": { baseValue: 5, unit: "damage" },
            "Bite.Latch.Primary": { baseValue: 32.5, unit: "damage" },
            "Bite.Latch.Secondary": { baseValue: 10, unit: "damage" }
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DinosaursData;
}