# 기여 안내

## 먼저 읽어주세요: 메모리 이미지는 커밋 금지

메모리 덤프에는 캡처 시점의 모든 것이 들어 있습니다. 비밀번호, 세션 토큰, 개인 키, 브라우저 히스토리, 문서 내용. 공개 저장소에 한 번 올라가면 커밋을 되돌려도 사라지지 않아요. 포크, 클론, 캐시, 크롤러에 남습니다.

지켜야 할 것:

- 증거 파일은 저장소 밖에 두세요. `.gitignore`에 의존하지 말고 애초에 작업 트리에 넣지 마세요.
- 테스트가 이미지를 필요로 하면 경로를 환경 변수로 받으세요. 파일을 저장소에 두지 마세요.
- 버그 리포트에 출력을 붙일 때는 프로세스 이름, 경로, 사용자명, IP를 가려주세요.
- 푸시 전에 `git status`와 `git diff --stat`을 확인하세요.

`.gitignore`가 `*.raw`, `*.mem`, `*.vmem`, `*.dmp`, `*.E01` 같은 흔한 확장자와 `evidence/`, `samples/`, `dumps/` 디렉터리를 막고 있습니다. 안전망이지 대책이 아닙니다.

## 라이선스

기여물은 **Volatility Software License v1.0**으로 들어옵니다. PR을 열면 그 조건에 동의하는 것으로 봅니다.

실질적으로 이런 제약이 따라옵니다.

- MIT, Apache-2.0, BSD, GPL 코드를 가져올 수 없습니다. VSL과 조건이 다릅니다.
- 의존성으로 추가하는 건 별개 문제지만, LGPL/GPL 라이브러리는 VSL의 전면 공개 요구와 충돌할 소지가 있으니 이슈에서 먼저 논의해주세요.
- Volatility 2는 GPLv2이고 Python 2 기반이라 신규 의존성으로 채택하지 않습니다.
- 소스에서 저작권 표시를 제거하지 마세요. VSL의 `Notices` 조항입니다.

이름에도 제약이 있습니다. VSL은 상표권을 넘기지 않으므로 **패키지명, 바이너리명, 로고, 도메인에 "Volatility"를 쓰지 않습니다.** 문서에서 상위 소프트웨어를 가리킬 때만 씁니다.

## 브랜치 전략

```
dev  ──▶  main  ──▶  release
```

- **`dev`** · 기본 작업 브랜치. 기능 브랜치는 여기서 따고 여기로 머지합니다.
- **`main`** · 통합 브랜치. `dev`에서 올라온 것이 모입니다.
- **`release`** · 배포 브랜치. 태그를 붙이고 릴리스 아티팩트를 만드는 지점.

작업 흐름:

```bash
git switch dev
git switch -c feat/process-tree
# 작업, 커밋
git push -u origin feat/process-tree
```

PR은 `dev`를 향합니다. `main`과 `release`로는 직접 커밋하지 말고 머지로만 올려주세요.

## 커밋 메시지

[Conventional Commits](https://www.conventionalcommits.org/)를 따릅니다.

```
feat(daemon): reuse Context across plugin runs
fix(ui): keep row selection when the result stream appends
docs(license): clarify the Addition clause
perf(daemon): warm the page-table cache on image open
```

타입: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

## 글쓰기 규칙

**em dash(`U+2014`)와 en dash(`U+2013`)를 쓰지 않습니다.** 코드 주석, 문서, UI 문구, 커밋 메시지 모두 해당합니다. 쉼표나 콜론, 마침표로 씁니다. `tests/house-style.spec.ts`가 저장소 전체를 검사해서 하나라도 있으면 실패합니다. (이 문서에 그 문자를 예시로 적을 수도 없습니다. 그래서 코드포인트로 씁니다.)

`LICENSE`만 예외입니다. 업스트림 원문이라 한 바이트도 바꾸지 않습니다.

## 릴리스 아티팩트

VSL의 `Notices` 조항은 소프트웨어 사본을 받는 모두가 라이선스 전문이나 링크를 함께 받도록 요구합니다. 그래서 모든 배포물(인스톨러, 아카이브, 컨테이너 이미지)에 `LICENSE`와 `NOTICE`를 동봉합니다. 패키징 설정을 건드린다면 이 두 파일이 빠지지 않았는지 확인해주세요.
