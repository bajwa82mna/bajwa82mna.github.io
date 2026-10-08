# Methods

SD is the sample standard deviation (n−1); SE is SD/√n. The 95% confidence interval uses the exact two-sided Student-t 0.975 quantile for `df=n−1`, computed by numerically inverting the CDF through the regularized incomplete beta function. Quartiles use the R-7 / Excel inclusive linear interpolation method, `h=(n−1)p`. Outliers are observations below Q1−1.5×IQR or above Q3+1.5×IQR. No observations are automatically removed.
