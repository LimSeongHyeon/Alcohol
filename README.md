# Alcohol

Volatility 3를 위한 데스크톱 메모리 포렌식 GUI.

> **개발 초기 단계입니다.** 아직 동작하는 애플리케이션이 없어요. 현재 저장소에는 라이선스, 기여 규칙, 프로젝트 설정만 들어 있습니다.

## 왜 만드나

Volatility 3는 강력하지만 CLI입니다. 플러그인 하나를 돌릴 때마다 명령을 다시 짜야 하고, 결과는 정렬도 필터도 안 되는 텍스트로 나오고, 프로세스 트리를 따라가려면 출력을 눈으로 훑어야 하죠.

그리고 느립니다. 정확히는, **느리게 쓰기 쉽습니다.**

프레임워크를 기동하는 것만으로 197개 플러그인 디스커버리에 웜 상태 0.7초, 콜드 1.7초가 듭니다. 여기에 Python 인터프리터 기동과, 이미지를 열 때의 automagic 스캔·심볼 테이블 로딩이 더 붙어요. `vol.py`를 플러그인마다 새로 띄우는 GUI는 사용자가 클릭할 때마다 이 비용을 처음부터 다시 냅니다.

Alcohol은 다르게 접근합니다.

- **웜 컨텍스트.** Volatility 3를 장기 실행 Python 데몬 안에 두고 `Context`와 레이어 스택을 이미지당 한 번만 만듭니다. 페이지 테이블 변환 캐시(`intel.py`의 `lru_cache`)와 심볼 테이블이 플러그인 실행 사이에 살아남아요.
- **플러그인 단위 병렬.** 한 플러그인 내부를 쪼개는 대신 서로 다른 플러그인을 각자의 워커 프로세스에서 동시에 돌립니다. Volatility의 `--parallelism`은 스캐너 내부만 병렬화하고, 재단 문서도 이득이 크지 않다고 적어놨거든요.
- **스트리밍 결과.** 플러그인은 제너레이터입니다. 완료를 기다리지 않고 행이 나오는 대로 테이블에 채웁니다.

## 스택

| 레이어 | 기술 |
|---|---|
| 셸 | Tauri (Rust) |
| UI | React + TypeScript |
| 분석 | Volatility 3 (Python 사이드카 데몬, JSON-RPC) |

## 라이선스

**이 프로젝트는 Volatility Software License v1.0 (VSL v1.0)을 따릅니다.** 전문은 [LICENSE](LICENSE)에 있고, 원문은 [volatilityfoundation.org/license/vsl-v1.0](https://www.volatilityfoundation.org/license/vsl-v1.0)에서 볼 수 있어요.

MIT도 Apache도 GPL도 아닙니다. 선택의 여지가 없었습니다.

VSL v1.0의 `Copyleft` 조항이 "Additions"를 이렇게 정의하거든요:

> "Additions" also includes any software designed to execute the software and parse its results, such as a wrapper written for the software, but does not include shell or execution menu software designed to execute software generally.

Alcohol은 Volatility 3를 실행하고 그 결과를 파싱하는 소프트웨어입니다. 정확히 wrapper고, 따라서 Addition입니다. 별도 프로세스로 분리해 호출하든 라이브러리로 링크하든 결과는 같습니다. 라이선스 문언이 링크 방식을 구분하지 않으니까요. 예외로 적힌 "범용 실행 셸/메뉴"에도 해당하지 않습니다. Alcohol은 Volatility 전용 GUI지 아무 프로그램이나 돌려주는 런처가 아니에요.

그래서 VSL이 요구하는 대로 전체 소스를 공개 저장소로 배포합니다.

**This project is not affiliated with or endorsed by the Volatility Foundation.**

VSL은 상표권을 넘기지 않습니다 (`Trademarks: This license grants you no rights to any trademarks or service marks.`). "Volatility"라는 이름은 이 프로젝트가 연동하는 상위 소프트웨어를 가리킬 때만 쓰고, 프로젝트명·패키지명·로고에는 쓰지 않습니다.

알아둘 점 두 가지:

- VSL은 OSI 승인 라이선스가 아닙니다. GitHub이 자동 인식하지 못해 라이선스가 `unknown`으로 표시될 수 있는데, 정상입니다.
- VSL은 위반 시 라이선스가 **즉시** 소멸합니다 (`Termination`). 유예 조항이 없어요.

기여자 저작권 표시는 [NOTICE](NOTICE)에 있습니다.

## 기여자에게

기여 전에 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어주세요. 특히 두 가지가 중요합니다.

**메모리 이미지를 절대 커밋하지 마세요.** 메모리 덤프에는 비밀번호, 세션 토큰, 개인 키, 개인정보가 그대로 들어 있습니다. 공개 저장소에 올라가면 되돌릴 수 없어요. `.gitignore`가 흔한 확장자를 막아두긴 했지만 그건 안전망이지 대책이 아닙니다. 증거 파일은 작업 트리 바깥에 두세요.

**기여물은 VSL v1.0으로 들어옵니다.** 다른 라이선스의 코드를 가져올 수 없다는 뜻이기도 합니다.

## 참고할 만한 프로젝트

- [VolWeb](https://github.com/k1nd0ne/VolWeb) · 웹 기반 협업 포렌식 플랫폼 (GPL-3.0)
- [Orochi](https://github.com/LDO-CERT/orochi) · 분산 메모리 포렌식 (MIT)

두 프로젝트 모두 VSL이 아닌 라이선스로 배포 중입니다. VSL의 Addition 조항을 문자 그대로 읽으면 VSL이어야 한다고 보고, Alcohol은 그쪽을 택했습니다.
