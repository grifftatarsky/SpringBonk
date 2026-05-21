package com.gpt.springbonk.security;

import com.c4_soft.springaddons.security.oidc.starter.ClaimSetAuthoritiesConverter;
import com.c4_soft.springaddons.security.oidc.starter.ConfigurableClaimSetAuthoritiesConverter;
import com.c4_soft.springaddons.security.oidc.starter.OpenidProviderPropertiesResolver;
import com.gpt.springbonk.constant.enumeration.security.Permission;
import com.gpt.springbonk.constant.enumeration.security.Role;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Map;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * Replaces the default spring-addons authorities converter so that every
 * application {@link Role} present in the JWT also contributes its bundled
 * {@link Permission}s as authorities.
 *
 * <p>Delegates to the stock converter for path extraction (so the
 * {@code authorities.path} YAML config still applies), then expands roles
 * into a deduplicated set of role + permission authorities. Unknown roles
 * (e.g. Keycloak defaults like {@code offline_access}) pass through
 * unmodified.
 */
@Component
@Primary
public class PermissionExpandingAuthoritiesConverter implements ClaimSetAuthoritiesConverter {
  private final ConfigurableClaimSetAuthoritiesConverter delegate;

  public PermissionExpandingAuthoritiesConverter(OpenidProviderPropertiesResolver resolver) {
    this.delegate = new ConfigurableClaimSetAuthoritiesConverter(resolver);
  }

  @Override
  public Collection<? extends GrantedAuthority> convert(Map<String, Object> source) {
    Collection<? extends GrantedAuthority> base = delegate.convert(source);
    LinkedHashSet<GrantedAuthority> expanded = new LinkedHashSet<>(base);
    for (GrantedAuthority authority : base) {
      Role.fromAuthority(authority.getAuthority()).ifPresent(role -> {
        for (Permission permission : role.getPermissions()) {
          expanded.add(new SimpleGrantedAuthority(permission.name()));
        }
      });
    }
    return expanded;
  }
}
