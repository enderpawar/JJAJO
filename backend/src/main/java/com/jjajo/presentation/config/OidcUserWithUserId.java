package com.jjajo.presentation.config;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * OIDC 로그인 시 Principal에 내부 userId를 포함시키기 위한 래퍼.
 * DefaultOidcUser는 attributes에 커스텀 값을 넣지 않으므로, getAttributes()에 userId를 추가해 반환한다.
 */
public class OidcUserWithUserId extends DefaultOidcUser {

    private final String userId;

    public OidcUserWithUserId(Collection<? extends GrantedAuthority> authorities,
                              OidcIdToken idToken,
                              OidcUserInfo userInfo,
                              String nameAttributeKey,
                              String userId) {
        super(authorities, idToken, userInfo, nameAttributeKey);
        this.userId = userId;
    }

    @Override
    public Map<String, Object> getAttributes() {
        Map<String, Object> attrs = new HashMap<>(super.getAttributes());
        if (userId != null) {
            attrs.put("userId", userId);
        }
        return attrs;
    }
}
